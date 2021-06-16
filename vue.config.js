const path = require("path");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");

module.exports = {
    transpileDependencies: ['vue-clamp', 'resize-detector'],
    chainWebpack: config => {
        config.resolve.alias.set("@", path.resolve(__dirname, "./src"));
    },
    configureWebpack: config => {
        if (process.env.NODE_ENV === "production") {
            return {
                plugins: [
                    new FaviconsWebpackPlugin(
                        path.resolve(__dirname, "./src/assets/images/logo.png")
                    )
                ]
            };
        } else {
            return {
                devServer: {
                    disableHostCheck: true,
                }
            };
        }
    }
};