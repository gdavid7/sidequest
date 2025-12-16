/**
 * =============================================================================
 * Message Server Actions
 * =============================================================================
 * 
 * Server actions for the chat functionality.
 * 
 * SECURITY MODEL:
 * Only the task poster and accepted worker can read/write messages.
 * This is enforced at multiple levels:
 * 1. Server action checks (this file)
 * 2. RLS policies (database level)
 * 
 * WHY BOTH?
 * - Server actions provide friendly error messages
 * - RLS provides defense-in-depth (if someone bypasses the server action)
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, MessageWithSender, Message } from '@/lib/types';

/**
 * Send a text message in a task chat.
 * 
 * SECURITY CHECKS:
 * 1. User must be authenticated
 * 2. User must be poster OR accepted worker
 * 3. Users must not be blocking each other
 * 4. Task must be ACCEPTED (chat only works after acceptance)
 * 
 * @param taskId - The task to send the message in
 * @param body - The message text
 */
export async function sendMessage(
  taskId: string,
  body: string
): Promise<ActionResult<Message>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Validate message body
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return { success: false, error: 'Message cannot be empty' };
    }
    if (trimmedBody.length > 2000) {
      return { success: false, error: 'Message is too long (max 2000 characters)' };
    }
    
    // Fetch the task to verify permissions
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    // Must be poster or accepted worker
    const isPoster = task.poster_id === user.id;
    const isWorker = task.accepted_by_user_id === user.id;
    
    if (!isPoster && !isWorker) {
      return { success: false, error: 'You are not a participant in this task' };
    }
    
    // Task must be accepted (or completed - can still chat after completion)
    if (task.status === 'OPEN') {
      return { success: false, error: 'Chat is only available after a task is accepted' };
    }
    
    if (task.status === 'CANCELED') {
      return { success: false, error: 'Cannot send messages in a canceled task' };
    }
    
    // Check for blocks between participants
    const { data: isBlocked } = await supabase
      .rpc('is_blocked', { 
        viewer_id: task.poster_id, 
        other_id: task.accepted_by_user_id 
      });
    
    if (isBlocked) {
      return { success: false, error: 'Unable to send message' };
    }
    
    // Insert the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        task_id: taskId,
        sender_id: user.id,
        type: 'TEXT',
        body: trimmedBody,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: 'Failed to send message' };
    }
    
    // [EXTENSION] Send push notification to other participant here
    // const recipientId = isPoster ? task.accepted_by_user_id : task.poster_id;
    // await sendPushNotification(recipientId, 'New message in task: ' + task.title);
    
    revalidatePath(`/tasks/${taskId}`);
    
    return { success: true, data: message };
  } catch (error) {
    console.error('sendMessage error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

/**
 * Get messages for a task.
 * 
 * SECURITY: RLS ensures only participants can read messages.
 * We also check server-side for friendly error messages.
 */
export async function getMessages(taskId: string): Promise<ActionResult<MessageWithSender[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Verify user is a participant
    const { data: task } = await supabase
      .from('tasks')
      .select('poster_id, accepted_by_user_id')
      .eq('id', taskId)
      .single();
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }
    
    const isPoster = task.poster_id === user.id;
    const isWorker = task.accepted_by_user_id === user.id;
    
    if (!isPoster && !isWorker) {
      return { success: false, error: 'You are not a participant in this task' };
    }
    
    // Fetch messages with sender info
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch messages:', error);
      return { success: false, error: 'Failed to load messages' };
    }
    
    return { success: true, data: messages || [] };
  } catch (error) {
    console.error('getMessages error:', error);
    return { success: false, error: 'Something went wrong' };
  }
}

