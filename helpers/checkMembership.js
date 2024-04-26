const checkMembership = async (ctx) => {
    const userId = ctx.from.id;
    const chatId = "@ton_idz"; // Replace with your channel username or ID
  
    try {
      const chatMember = await ctx.telegram.getChatMember(chatId, userId);
      if (
        chatMember.status === "member" ||
        chatMember.status === "administrator" ||
        chatMember.status === "creator"
      ) {
        return { success: true, joined: true };
      } else {
        return { success: true, joined: false };
      }
    } catch (error) {
      console.error("Error checking membership:", error);
      // Check if the error is related to the user not being found
      if (error.code === 400 && error.description === 'Bad Request: user not found') {
        // Handle the case where the user is not found in the chat
        return { success: true, joined:false };
      } else {
        // Handle other errors
        return { success: false, error: 'An error occurred while checking membership' };
      }
    }
  };
  
  module.exports = checkMembership;
  