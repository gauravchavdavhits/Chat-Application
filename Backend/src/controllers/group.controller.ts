import { Request, Response } from 'express';
import { GroupModel } from '../models/group.model';
import { MessageModel } from '../models/message.model';
import { UserModel } from '../models/user.model';
import { getSocketIO } from '../sockets/chat.socket';
import { HttpStatus } from '../constants/httpStatus';
import { sendSuccess, sendError } from '../utils/response';

// @desc    Create a new group
// @route   POST /api/groups
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.body.adminId || (req as any).user?.userId;
    const { name, avatar } = req.body;
    const members = req.body.members || [];

    if (!name || !adminId) {
      sendError(res, 'Group name and adminId are required', HttpStatus.BAD_REQUEST);
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

    sendSuccess(res, newGroup, undefined, HttpStatus.CREATED);
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// @desc    Get user's groups
// @route   GET /api/groups/my-groups/:userId
export const getUserGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      sendError(res, 'UserId is required', HttpStatus.BAD_REQUEST);
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

    sendSuccess(res, groupsWithMessages, undefined, HttpStatus.OK, { count: groupsWithMessages.length });
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// @desc    Update a group (name, avatar, members)
// @route   PUT /api/groups/:groupId
export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const adminId = req.body.adminId || (req as any).user?.userId;
    const { name, avatar, members } = req.body;

    const group = await GroupModel.findById(groupId);
    if (!group) {
      sendError(res, 'Group not found', HttpStatus.NOT_FOUND);
      return;
    }

    if (adminId && group.adminId !== adminId) {
      sendError(res, 'Only admin can update the group', HttpStatus.FORBIDDEN);
      return;
    }

    if (name) group.name = name;
    if (avatar !== undefined) group.avatar = avatar;
    if (members && Array.isArray(members)) {
       const uniqueMembers = new Set([...members, group.adminId]);
       group.members = Array.from(uniqueMembers);
    }

    await group.save();

    sendSuccess(res, group, undefined, HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// @desc    Leave a group
// @route   POST /api/groups/:groupId/leave
export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.body.userId || (req as any).user?.userId;

    if (!userId) {
      sendError(res, 'UserId is required', HttpStatus.BAD_REQUEST);
      return;
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      sendError(res, 'Group not found', HttpStatus.NOT_FOUND);
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
      sendSuccess(res, null, 'Group deleted', HttpStatus.OK);
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

    sendSuccess(res, null, 'Left group successfully', HttpStatus.OK);
  } catch (error: any) {
    sendError(res, error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
