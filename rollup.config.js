export default {
    input: "lib/mobx-utils.js",
    output: [
        {
            format: "umd",
            file: "mobx-utils.umd.js",
            name: "mobxUtils",
            globals: {
                mobx: "mobx",
            },
        },
        {
            format: "es",
            file: "mobx-utils.module.js",
        },
    ],
    external: ["mobx"],
    onwarn: function (warning, warn) {
        // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
        if ("THIS_IS_UNDEFINED" === warning.code) return

        warn(warning)
    },
}
