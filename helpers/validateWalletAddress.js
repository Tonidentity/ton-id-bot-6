function validateWalletAddress(address) {
  // Check if address is a string
  if (typeof address !== "string") {
    return false;
  }

  // Address length check (basic spam prevention)
  if (address.length > 50) {
    return false;
  }

  // Check for links (spam prevention)
  if (
    address.startsWith("http") ||
    address.startsWith("https") ||
    address.startsWith("t.me")
  ) {
    return false;
  }

  // Standard Ton user-friendly format (with "ton:")
  if (address.startsWith("ton:")) {
    // Check length and format
    if (address.length > 50 || !/^[A-Za-z0-9+/]{44}$/.test(address.slice(4))) {
      return false;
    }
    return true;
  }

  if (address.length < 40) {
    return false;
  }

  // Raw Ton address format (base64 encoded string)
  if (
    address.length < 50 &&
    /^[A-Za-z0-9+/]{42}[A-Za-z0-9]{2}=?$/i.test(address)
  ) {
    return true;
  }

  // Tentative new format (use with caution, update with confirmed format if available)
  if (address.length < 50 && /^[A-Za-z0-9_-]+$/.test(address)) {
    // Allow for alphanumeric characters, underscores, and hyphens in the new format
    return true;
  }

  // Address doesn't match any known format
  return false;
}

module.exports = validateWalletAddress;
