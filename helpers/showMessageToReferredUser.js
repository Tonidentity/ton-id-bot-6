const showMessageToReferredUser = (referrerUsername, ctx) => {
  let replyText = `*Welcome to Ton identity network!*
  
You were referred by @${referrerUsername}
    
Ton identity network is an unofficial network of ton everyday users and passionate.😇
  
Pioneering the first Blockchain fan token which is Ton Fan Token "TFT"
    
Keep sharing keep earning! Free TFT 😍\n\nComplete the tasks below:`;

  const replyMarkup = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Task 1: Follow Ton Fam Token on 𝕏",
            url: "https://x.com/ton_fam_token",
          },
        ],
        [
          {
            text: "Task 2: Subscribe to our telegram channel ➤",
            url: "https://t.me/ton_idz",
          },
        ],
        [
          {
            text: "Task 3: Follow Ton Fan Token on 𝕏",
            url: "https://x.com/ton_fan_token",
          },
        ],
        [
          {
            text: "Click me when you're done.",
            callback_data: "take_wallet",
          },
        ],
      ],
    },
  };

  ctx.reply(replyText, {
    ...replyMarkup,
    parse_mode: "Markdown",
  });
};

module.exports = showMessageToReferredUser;