

import { Request, Response } from 'express';
import { GroupModel } from '../models/group.model';
import { MessageModel } from '../models/message.model';
import { UserModel } from '../models/user.model';
import { getSocketIO } from '../sockets/chat.socket';

// @desc    Create a new group
// @route   POST /api/groups
// @access  Public
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, avatar, adminId, members } = req.body;

    if (!name || !adminId || !members || !Array.isArray(members)) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // Ensure admin is in members list
    const uniqueMembers = new Set([...members, adminId]);

    const newGroup = await GroupModel.create({
      name,
      avatar: avatar || '',
      adminId,
      members: Array.from(uniqueMembers),
    });

    res.status(201).json({
      success: true,
      data: newGroup,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's groups
// @route   GET /api/groups/my-groups/:userId
// @access  Public
export const getUserGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ success: false, message: 'UserId is required' });
      return;
    }

    const groups = await GroupModel.find({ members: userId }).lean();

    // Fetch last message for each group
    const groupsWithMessages = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await MessageModel.findOne({ groupId: group._id.toString() })
          .sort({ createdAt: -1 })
          .lean();

        return {
          group,
          lastMessage: lastMessage?.isDeletedForEveryone ? "🚫 This message was deleted" : (lastMessage?.message || (lastMessage?.fileUrl ? 'File attached' : undefined)),
          lastMessageTime: lastMessage?.createdAt,
        };
      })
    );

    // Sort by most recent message, or creation date if no messages
    groupsWithMessages.sort((a: any, b: any) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.group.createdAt).getTime();
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.group.createdAt).getTime();
      return timeB - timeA;
    });

    res.status(200).json({
      success: true,
      count: groupsWithMessages.length,
      data: groupsWithMessages,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update group (add/remove members, change name/avatar)
// @route   PUT /api/groups/:groupId
// @access  Public
export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { name, avatar, members, adminId } = req.body; // adminId passed to verify permissions

    const group = await GroupModel.findById(groupId);
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    if (group.adminId !== adminId) {
      res.status(403).json({ success: false, message: 'Only admin can update the group' });
      return;
    }

    if (name) group.name = name;
    if (avatar !== undefined) group.avatar = avatar;
    if (members && Array.isArray(members)) {
       const uniqueMembers = new Set([...members, group.adminId]);
       group.members = Array.from(uniqueMembers);
    }

    await group.save();

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Leave a group
// @route   POST /api/groups/:groupId/leave
// @access  Public
export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'UserId is required' });
      return;
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    const user = await UserModel.findById(userId);
    const userName = user ? user.username : 'A user';

    // Remove user from members list
    group.members = group.members.filter(id => id !== userId);

    if (group.members.length === 0) {
      // Delete group if no members left
      await GroupModel.findByIdAndDelete(groupId);
      await MessageModel.deleteMany({ groupId });
      res.status(200).json({ success: true, message: 'Group deleted' });
      return;
    } 
    
    if (group.adminId === userId) {
      // Reassign admin to next member
      group.adminId = group.members[0];
    }
    
    await group.save();

    // Create system notification message in the group: "<username> left the group"
    const leaveMessage = await MessageModel.create({
      conversationId: `group_${groupId}`,
      groupId,
      senderId: userId,
      senderName: userName,
      message: `${userName} left the group`,
      status: 'read',
    });

    // Broadcast system message to remaining members via Socket.IO
    const io = getSocketIO();
    if (io) {
      const payload = {
        id: leaveMessage._id.toString(),
        conversationId: `group_${groupId}`,
        senderId: userId,
        senderName: userName,
        groupId,
        message: `${userName} left the group`,
        timestamp: leaveMessage.createdAt,
        status: 'read',
      };
      io.to(`group_${groupId}`).emit('receive_message', payload as any);
      io.to(groupId).emit('receive_message', payload as any);
    }

    res.status(200).json({
      success: true,
      message: 'Left group successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
