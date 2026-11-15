const { getDefaultConfig } = require("expo/metro-config");
const { withStylus } = require("react-native-stylus/metro");

module.exports = withStylus(getDefaultConfig(__dirname));
