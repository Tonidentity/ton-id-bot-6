const { Telegraf } = require("telegraf");
const rateLimit = require("telegraf-ratelimit");
require("dotenv").config();
const express = require("express");
const app = express();
const { Schema, model, default: mongoose } = require("mongoose");
const { v1: uuidv1 } = require("uuid");
const bodyParser = require("body-parser");
const cors = require("cors");
const userHasBeenReferred = require("./helpers/userHasBeenReferred");
const handleReferral = require("./helpers/handleReferral");
const BotUser = require("./model/BotUserModel");
const validateWalletAddress = require("./helpers/validateWalletAddress");
const checkMembership = require("./helpers/checkMembership");
const bot = new Telegraf(process.env.BOT_TOKEN);
const fs = require('fs');
const Queue = require("queue-promise");


// Create a queue instance
const queue = new Queue({
  concurrent: 25, // Process one request at a time
  interval: 3000, // Interval between dequeue operations (1 second)
});

// Apply rate-limiting middleware
// const limitConfig = {
//   window: 1000, // 1 second
//   limit: 1, // 1 request per second
//   keyGenerator: (ctx) => ctx.chat.id, // Use chat ID as the key for rate limiting
//   onLimitExceeded: (ctx, next) => ctx.reply("Rate limit exceeded!"), // Action to take when rate limit is exceeded
// };
// bot.use(rateLimit(limitConfig));


const chatIdToForwardAddresses = process.env.FORWARD_CHAT_ID;
let initialBalance = 1000;
let aboutToTakeWalletAddress = false;

const checkIfUserAlreadyExists = async (userId) => {
  const userExists = await BotUser.findOne({ userId });
  if (userExists) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin: "*",
  })
);

// Parse URL-encoded bodies (deprecated in Express v4.16+)
app.use(bodyParser.urlencoded({ extended: false }));

// Parse JSON bodies
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

//Endpoint for referral link
app.post("/referUser/:referralLink", async (req, res) => {
  const referralLink = req.params.referralLink;
  if (!referralLink) {
    res.status(404).json({
      success: true,
      message:
        "This link does not exist. Please ask its owner to send you a valid link.",
    });
  }

  try {
    if (linkOwner) {
      //Update balance
      const newBalance = linkOwner.balance + 200;
      linkOwner.balance = newBalance;

      //Update referral count
      const newReferralsCount = linkOwner.referralsCount + 1;
      linkOwner.referralsCount = newReferralsCount;

      //Save updates
      await linkOwner.save();
      res.status(200).json({
        success: true,
        data: { name: linkOwner.name, username: linkOwner.username },
      });
    } else {
      res.status(404).json({
        success: true,
        message:
          "This link does not exist. Please ask its owner to send you a valid link.",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured. Please reload and try again.",
    });
  }
});

app.get("/admin-info", async (req, res) => {
  try {
    //Fetch all users
    const usersInDb = await BotUser.find();
    //Calculate total users
    const usersCount = usersInDb.length;
    //Calculate and store amounts earned
    let totalAmountEarnedByAllUsers = 0;
    usersInDb.forEach((eachUser) => {
      totalAmountEarnedByAllUsers += eachUser.balance;
    });

    res.status(200).json({
      success: true,
      data: {
        allUsers: usersInDb,
        numberOfUsers: usersCount,
        totalAmountEarnedByAllUsers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Our service is down. Please try again later.",
    });
  }
});

const port = process.env.PORT || 7000;

mongoose
  .connect(process.env.URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`App is listening on port ${port}`);
    });
    console.log("Connected to db.");
  })
  .catch((err) => {
    console.log(`Error connecting to db: ${err}`);
  });

const introMessage = `Ton identity network is an unofficial network of ton everyday users and passionate.😇

Pioneering the first Blockchain fan token which is Ton Fan Token "TFT"

Keep sharing keep earning! Free TFT 😍\n\nComplete the tasks below:`;

const showUserDetails = async (userId, ctx, clickedReferralLink) => {
  try {
    const userInfo = await BotUser.findOne({ userId });
    if (!userInfo) {
      return;
    }

    //Update full name and username if user changed them after using the bot initially
    const {
      name,
      username,
      walletAddress,
      referralLink,
      balance,
      referralsCount,
    } = userInfo;
    const currentName = `${ctx.from.first_name} ${ctx.from.lastName || ""}`;
    const currentUsername = ctx.from.username;

    if (name !== currentName || username !== currentUsername) {
      //Save updated details
      await BotUser.findOneAndUpdate(
        { userId },
        {
          name: currentName,
          username: currentUsername,
        }
      );
    }

    if (clickedReferralLink) {
      return ctx.reply(
        `You already have an account.\n\nKeep sharing your referral link to earn more TFT.\n\n*Referral link:*[ ](t.me/ton_idz)\n\n\`${referralLink}\`\n_(Tap to copy)_`,
        { parse_mode: "Markdown", disable_web_page_preview:true }
      );
    }

    //Display user information
    const totalReferralEarnings = balance - initialBalance;
    const message = `Name: *${currentName}*\n\nUsername: *${currentUsername}*\n\nWallet Address: *${walletAddress}*\n\nBalance: *${balance} TFT*\n\nTotal Referrals: *${referralsCount}*\n\nAmount earned from referrals: *${totalReferralEarnings} TFT*\n\nKeep sharing your referral link with friends, to earn *200 TFT per referral*.\n\n*Referral Link:*[ ](t.me/ton_idz)\n\`${referralLink}\`\n_(Tap to copy)_`;
    ctx.telegram.sendMessage(ctx.chat.id, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.log(error);
    ctx.reply("Sorry i missed that. Please try again.");
  }
};

//Checked if user blocked the user
const botIsBlocked = async (chatId) => {
  try {
    const chatMember = await bot.telegram.getChatMember(chatId, bot.botInfo.id);
    return chatMember.status === "left" || chatMember.status === "kicked";
  } catch (error) {
    console.error("Error checking user status:", error);
    // Return true to handle the error gracefully, assuming the user is blocked
    return true;
  }
};

bot.start(async (ctx) => {
  queue.enqueue(async () => {
    const userId = ctx.from.id;
    let userExists = await checkIfUserAlreadyExists(userId);

    const inviteId = ctx.payload;
    let linkFirstChunk = "t.me/tonfantoken06_bot?start=";
    //If user started the bot via a referral link
    if (inviteId) {
      //Check if link is valid
      const linkOwnerData = await BotUser.findOne({
        referralLink: linkFirstChunk + inviteId,
      });

      //Inform user they've been already referred, and show their referral link
      if (userExists) {
        return await showUserDetails(userId, ctx, true);
      }

      if (!linkOwnerData) {
        return ctx.reply(
          "Sorry that link is invalid. Please check and try again."
        );
      }

      //Check if user tried to refer themselves
      if (linkOwnerData.userId == userId) {
        return ctx.reply(
          `You clicked your own link.\nSorry, you cannot refer yourself.\n\nKeep sharing your link with others to earn more TFT. [ ](t.me/ton_idz)
  \n\`${linkOwnerData.referralLink}\`\n_(Tap to copy)_`,
          {
            parse_mode: "Markdown",
          }
        );
      }

      // Check if user has already been referred via this link but hasn't completed required tasks(no account on database)
      const alreadyReferred = await userHasBeenReferred(userId);

      //If an error prevented checking
      if (alreadyReferred.error) {
        return ctx.reply("An error occured.");
      }

      //if user is already referred
      if (alreadyReferred.result) {
        //Check if they have no account
        const userData = await BotUser.findOne({ userId });
        //If they don't haven't complete their tasks
        if (!userData) {
          return ctx.reply(
            `You have already been referred, but you haven't completed your tasks.\n\nComplete the tasks below to continue:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Task 1: Follow Ton Identity on 𝕏",
                      url: "https://x.com/ton_identity",
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
            }
          );
        }

        if (userData) {
          return ctx.reply(
            `You already have an account with us.\n\nKeep sharing your referral links to earn more TFT😍🤩🤩\n\n\`${userData.referralLink}\`\n_(Tap to copy)_`,
            { parse_mode: "Markdown" }
          );
        }
      }

      //Process referral
      return await handleReferral(ctx, linkOwnerData, userId);
    }

    //If they didn't come via a referral link but they have an account already
    if (userExists) {
      return await showUserDetails(userId, ctx);
    }

    //check if user already exists

    // let chatId = ctx.chat.id

    // Check if user already blocked the bot
    // if(botIsBlocked(chatId)){
    //   return ctx.reply('Sorry, it seems you have blocked the bot.');
    //   console.log(ctx.from.username)
    //  return
    // }

    //Sends this if user wasn't referred and they don't have an account yet.
    // takenAddress = false;
    ctx.telegram.sendMessage(ctx.chat.id, introMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Task 1: Follow Ton Identity on 𝕏",
              url: "https://x.com/ton_identity",
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
    });
  });
});

bot.action("take_wallet", async (ctx) => {
  queue.enqueue(async () => {
    //   if(ctx.message){
    // ctx.deleteMessage();
    //   }

    const joinedChannel = await checkMembership(ctx);

    //If join check failed
    if (!joinedChannel.success) {
      return ctx.reply("An error occured, please try again.");
    }

    //If user hasn't joined TG channel
    if (!joinedChannel.joined) {
      return ctx.reply(
        "You are yet to join our channel, please join @ton_idz to continue."
      );
    }

    //Do this if user has joined.

    isDone = true;
    aboutToTakeWalletAddress = true;
    ctx.telegram.sendMessage(
      ctx.chat.id,
      "Great! Now send me your TON wallet address."
    );
  });
});

bot.on("message", async (ctx) => {
  queue.enqueue(async () => {
    const userId = ctx.from.id;
    const userExists = await checkIfUserAlreadyExists(userId);
    //Show user account details if user already exists
    if (userExists && ctx.message.text.trim() == "/account_info") {
      return showUserDetails(userId, ctx);
    }

    if (!userExists && ctx.message.text.trim() == "/account_info") {
      return ctx.reply(
        "You have no account yet. Please start the bot and follow the instructions."
      );
    }

    if (!aboutToTakeWalletAddress) {
      return ctx.reply(
        "Invalid message/command. Please click the menu to view valid commands."
      );
    }

    if (ctx.message.text.trim()) {
      let walletAddress = ctx.message.text.trim();
      const isWalletValid = validateWalletAddress(walletAddress);

      if (!isWalletValid) {
        await ctx.reply("Invalid address.\n Make sure it's a TON wallet address.");
        // Prompt user again for wallet address recursively
        await promptForWalletAddress(ctx);
      } else {
        aboutToTakeWalletAddress = false;
        //Create user account and store in db
        const newReferralLink = `t.me/tonfantoken06_bot?start=${uuidv1()}`;
        const newUser = new BotUser({
          chatId: ctx.chat.id,
          userId: ctx.from.id,
          username: `${ctx.from.username || "Empty"}`,
          name: `${ctx.from.first_name || "No"} ${
            ctx.from.last_name || "Name"
          }`,
          referralsCount: 0,
          balance: initialBalance,
          walletAddress,
          referralLink: newReferralLink,
          ipAddress: "",
        });

        await newUser.save();

        // If wallet is valid
        await ctx.reply(
          `Thanks!😊\nWe have received your wallet address!
        \nWait for Airdrop👍\n\nShare your referral link with friends, to earn 200 TFT per referral.\n\n*Referral Link:*\n\n\`${newReferralLink}\`\n_(Tap to copy)_`,
          { parse_mode: "Markdown" }
        );
        // isDone = false;
        // takenAddress = true;

        // Send wallet address only to the specified group
      }
    }
  });
});

const promptForWalletAddress = async (ctx) => {
  await ctx.reply("Please enter a valid wallet address:");
};

bot.command("account_info", async (ctx) => {
  queue.enqueue(async () => {
    // Extract user ID from the message
    const userId = ctx.from.id;

    // Check if the user exists in the database
    const userExists = await checkIfUserAlreadyExists(userId);
    if (userExists) {
      // If the user exists, show their account information
      await showUserDetails(userId, ctx);
    } else {
      // If the user does not exist, prompt them to start the bot first
      await ctx.reply("Please start the bot first.");
    }
  });
});

// Set bot commands for Telegram
bot.telegram.setMyCommands([
  { command: "start", description: "Start the TON ID Bot" },
  {
    command: "account_info",
    description: "Check your TON ID account information",
  },
]);

bot.launch();
