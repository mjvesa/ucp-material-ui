import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace";

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = false; //!process.env.ROLLUP_WATCH;

export default {
  input: "src/ucp.js",
  output: {
    file: "build/bundle.js",
    name: "bundle",
    format: "iife", // immediately-invoked function expression — suitable for <script> tags
    sourcemap: true
  },
  plugins: [
    resolve(), // tells Rollup how to find date-fns in node_modules
    replace({
      "process.env.NODE_ENV": JSON.stringify(
        production ? "production" : "development"
      )
    }),
    commonjs({
      include: "node_modules/**",
      namedExports: {
        "react-is": ["ForwardRef", "isValidElementType", "isFragment"],
        "prop-types": ["elementType"],
        "node_modules/react/index.js": [
          "Children",
          "Component",
          "PureComponent",
          "PropTypes",
          "createElement",
          "Fragment",
          "cloneElement",
          "StrictMode",
          "createFactory",
          "createRef",
          "createContext",
          "isValidElement",
          "isValidElementType"
        ]
      }
    }), // converts date-fns to ES modules
    production && terser() // minify, but only in production
  ]
};
