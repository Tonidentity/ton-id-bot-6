const isURL = (str) => {
  // Regular expression to match URLs with http:// or https://
  const urlRegex =
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i;

  // Test the string against the regular expression
  return urlRegex.test(str);
};

const isEmail = (str) => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  return emailRegex.test(str);
};

const validateWalletAddress = (address) => {
  const MIN_LENGTH = 30; // Adjust based on your specific wallet address format
  const MAX_LENGTH = 42; // Adjust based on your specific wallet address format

  // Remove leading/trailing whitespace and convert to lowercase for consistent comparison
  const trimmedAddress = address.trim().toLowerCase();

  // Check if the address is empty or too short
  if (!trimmedAddress || trimmedAddress.length < MIN_LENGTH) {
    return false;
  }

  // Check if the address exceeds the maximum length
  if (trimmedAddress.length > MAX_LENGTH) {
    return false;
  }

  // Check if the address contains common spam phrases or patterns
  const spamPatterns = [
    "t.me/",
    "https://t.me/",
    "https://x.com/",
    "https://x.com/t",
    "https://x.com/ton_",
    "https://t.me/gamee",
    "https://t.me/Tetherwalletbots_bot",
    "https://t.me/tiger_drop_bot"
  ];

  if (spamPatterns.some(pattern => trimmedAddress.includes(pattern))) {
    return false;
  }

  // Check if the address looks like a URL
  if (isURL(trimmedAddress)) {
    return false;
  }

  if(isEmail(trimmedAddress)){
    return false
  }

  // Check if the address contains any non-alphanumeric characters
  // if (!/^[a-zA-Z0-9]+$/.test(trimmedAddress)) {
  //   return false;
  // }

  // Check if the address starts with a specific prefix
  // if (!trimmedAddress.startsWith("0x")) {
  //   return false;
  // }

  // You can add more specific checks based on the format of valid wallet addresses

  // If none of the above conditions are met, consider it a valid wallet address
  return true;
};

module.exports = validateWalletAddress;
