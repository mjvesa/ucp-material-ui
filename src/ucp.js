import React from "react";
import ReactDOM from "react-dom";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Select from "@material-ui/core/Select";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Checkbox from "@material-ui/core/Checkbox";
import MenuItem from "@material-ui/core/MenuItem";
import Slider from "@material-ui/core/Slider";

/*
window.setTimeout(() => {
  const containerEl = document.createElement("div");
  containerEl.setAttribute("id", "data-unide-container");
  document.body.appendChild(containerEl);
});
*/

window.UnideCP = window.UnideCP || {};

window.UnideCP.getPaperElement = () => {
  return document.body; //querySelector("#data-unide-container");
};

window.UnideCP.getDocument = () => {
  return document;
};

const componentMap = {
  "unide-button": Button,
  "unide-checkbox": Checkbox,
  "unide-slider": Slider,
  "unide-text-field": TextField,
  "unide-select": Select,
  "unide-tabs": Tabs,
  "unide-tab": Tab
};

const propRewriteRules = {
  "unide-tab": {
    textContent: [["label", "%"]]
  },
  "unide-button": {
    theme: [
      ["variant", "contained"],
      ["color", "%"]
    ]
  }
};

const ATIRRewrite = (code, propRewriteRules) => {
  const result = [];
  const stack = [];
  let currentTag = "";
  console.log(JSON.stringify(code));

  code.forEach((str, index) => {
    const trimmed = str.trim();
    switch (trimmed) {
      case "(": {
        currentTag = stack.pop();
        result.push(currentTag);
        result.push("(");
        break;
      }
      case ")": {
        result.push(")");
        break;
      }
      case "=": {
        const tos = stack.pop();
        const nos = stack.pop();
        let rewrote = false;
        if (propRewriteRules.hasOwnProperty(currentTag)) {
          const rules = propRewriteRules[currentTag];
          if (rules.hasOwnProperty(nos)) {
            rewrote = true;
            for (let prop of rules[nos]) {
              result.push(prop[0]);
              if (prop[1] === "%") {
                result.push(tos);
              } else {
                result.push(prop[1]);
              }
              result.push("=");
            }
          }
        }

        if (!rewrote) {
          result.push(nos);
          result.push(tos);
          result.push("=");
        }
        break;
      }
      default: {
        stack.push(trimmed);
        break;
      }
    }
  });
  console.log(JSON.stringify(result));
  return result;
};

window.UnideCP.modelToDOM = (
  code,
  target,
  inert = false,
  components,
  handlers
) => {
  const stack = [];
  const tree = [];
  let current = { tag: "", props: {}, children: [] };

  ATIRRewrite(code, propRewriteRules).forEach((str, index) => {
    const trimmed = str.trim();
    switch (trimmed) {
      case "(": {
        tree.push(current);
        current = { tag: stack.pop(), props: {}, children: [] };
        current.props["data-design-id"] = index;
        current.props["draggable"] = true;
        current.props["onDragStart"] = event => {
          console.log("DRAGGO STARTO");
          handlers.startDragFromModel(index, event);
        };
        break;
      }
      case ")": {
        const newEl = current;
        current = tree.pop();

        let tag = componentMap.hasOwnProperty(newEl.tag)
          ? componentMap[newEl.tag]
          : newEl.tag;
        current.children.push(
          React.createElement(tag, newEl.props, newEl.children)
        );
        break;
      }
      case "=": {
        const tos = stack.pop();
        const nos = stack.pop();

        if (nos === "textContent") {
          current.children.push(tos);
        } else if (nos === "style") {
          const style = {};
          const rules = tos.split(";");
          for (let rule of rules) {
            const prop = rule.split(":");
            const name = prop[0]
              .replace(/-([a-z])/g, function(g) {
                return g[1].toUpperCase();
              })
              .trim();

            if (name !== "") {
              console.log("adding style : " + name + " value: " + prop[1]);
              style[name] = prop[1];
            }
          }
          current.props["style"] = style;
          /*
          TODO: Just parse the CSS
          const css = `{${tos
            .replace(/;/g, '",')
            .replace(/-([a-z])/g, function(g) {
              return g[1].toUpperCase();
            })
            .replace(/:/g, ':"')
            .concat('"')}}`;
          console.log("attempting to parse: " + css);
          current.props[nos] = JSON.parse(css);*/
        } else {
          try {
            const json = JSON.parse(tos);
            current.props[nos] = json;
          } catch (e) {
            current.props[nos] = tos;
          }
        }
        break;
      }
      default: {
        stack.push(trimmed);
      }
    }
  });
  ReactDOM.render(current.children, target);
};

/*
window.UnideCP.modelToDOM = (code, target, inert = false, components, handlers) => {
  const stack = [];
  const tree = [];
  let current = target;
  // current = target;
  code.forEach((str, index) => {
    const trimmed = str.trim();
    switch (trimmed) {
      case "(": {
        const old = current;
        tree.push(current);
        const tag = stack.pop();
        // Nested designs, attach shadow root, append style and content
        if (components && tag in components) {
          console.log("creating shadow root for nested");
          current = document.createElement("div");
          const root = document.createElement("div");
          current.attachShadow({ mode: "open" });
          current.shadowRoot.appendChild(root);
          const style = document.createElement("style");
          style.textContent = storedDesigns.designs[tag].css;
          current.shadowRoot.appendChild(style);
          modelToDOM(components[tag].tree, root, true);
        } else {
          current = document.createElement(tag);
        }
        if (!inert && handlers) {
          current.setAttribute("data-design-id", index);
          current.ondragstart = event => {
            handlers.startDragFromModel(index, event);
            //startDragFromModel(index, event);
          };
          current.ondblclick = event => {
            //navigateTo(event);
            handlers.doubleClick(event);
          };

          current.oncontextmenu = event => {
          handlers.contextMenu(event);
            //insertCssRule(event.target);
            //event.stopPropagation();
            //event.preventDefault();
          };
          current.draggable = true;
        }
        old.appendChild(current);
        break;
      }
      case ")": {
        current = tree.pop();
        break;
      }
      case "=": {
        const tos = stack.pop();
        const nos = stack.pop();
        if (nos in current) {
          try {
            const json = JSON.parse(tos);
            current[nos] = json;
          } catch (e) {
            current[nos] = tos;
            current.setAttribute(nos, tos);
          }
        } else {
          current.setAttribute(nos, tos);
        }

        break;
      }
      default: {
        stack.push(trimmed);
      }
    }
  });
  return current;
};
*/
