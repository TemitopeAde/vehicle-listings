/**
 * THIS FILE IS AUTO-GENERATED — DO NOT EDIT.
 * It contains the `editorElement` portion of the manifest, automatically derived from your component's
 * source code, prop types, and CSS rules.
 * Update your source code and run `npx wix build && npx wix generate manifest` to regenerate it.
 * If you need to override specific manifest values (sizing, layout, etc.),
 * you can do so in vehicle-inventory.extension.ts.
 */

import type { EditorElement } from '@wix/react-component-schema';

export const editorElement = {
  "selector": ".vehicle-inventory",
  "displayName": "Vehicle Inventory",
  "data": {
    "direction": {
      "displayName": "Direction",
      "dataType": "direction"
    },
    "title": {
      "displayName": "Title",
      "dataType": "text",
      "text": {}
    },
    "description": {
      "displayName": "Description",
      "dataType": "text",
      "text": {}
    },
    "itemLimit": {
      "displayName": "Item Limit",
      "dataType": "number",
      "number": {
        "min": "1",
        "max": "100"
      }
    },
    "featuredOnly": {
      "displayName": "Featured Only",
      "dataType": "booleanValue"
    }
  },
  "elements": {
    "vehicleInventoryHeading": {
      "elementType": "inlineElement",
      "inlineElement": {
        "selector": ".vehicle-inventory-heading",
        "displayName": "Heading",
        "behaviors": {
          "removable": true,
          "selectable": false
        },
        "cssProperties": {
          "font": {
            "defaultValue": "650 32px system-ui,sans-serif"
          },
          "lineHeight": {},
          "letterSpacing": {},
          "textDecorationLine": {},
          "textTransform": {},
          "textAlign": {},
          "textShadow": {},
          "color": {},
          "marginTop": {
            "defaultValue": "0"
          },
          "marginBottom": {
            "defaultValue": "0"
          },
          "marginInlineStart": {
            "defaultValue": "0"
          },
          "marginInlineEnd": {
            "defaultValue": "0"
          },
          "display": {
            "display": {
              "displayValues": [
                "none",
                "block"
              ]
            }
          },
          "alignSelf": {}
        }
      }
    },
    "vehicleInventoryDescription": {
      "elementType": "inlineElement",
      "inlineElement": {
        "selector": ".vehicle-inventory-description",
        "displayName": "Description",
        "behaviors": {
          "removable": true,
          "selectable": false
        },
        "cssProperties": {
          "font": {
            "defaultValue": "16px/1.6 system-ui,sans-serif"
          },
          "lineHeight": {
            "defaultValue": "1.6"
          },
          "letterSpacing": {},
          "textDecorationLine": {},
          "textTransform": {},
          "textAlign": {},
          "textShadow": {},
          "color": {},
          "marginTop": {
            "defaultValue": "0"
          },
          "marginBottom": {
            "defaultValue": "0"
          },
          "marginInlineStart": {
            "defaultValue": "0"
          },
          "marginInlineEnd": {
            "defaultValue": "0"
          },
          "display": {
            "display": {
              "displayValues": [
                "none",
                "block"
              ]
            }
          },
          "alignSelf": {}
        }
      }
    },
    "vehicleInventoryInventory": {
      "elementType": "inlineElement",
      "inlineElement": {
        "selector": ".vehicle-inventory-inventory",
        "displayName": "Inventory",
        "behaviors": {
          "removable": true,
          "selectable": false
        },
        "cssProperties": {
          "background": {
            "defaultValue": "#fff"
          },
          "borderTop": {
            "defaultValue": "1px solid #dce4de"
          },
          "borderBottom": {
            "defaultValue": "1px solid #dce4de"
          },
          "borderInlineStart": {
            "defaultValue": "1px solid #dce4de"
          },
          "borderInlineEnd": {
            "defaultValue": "1px solid #dce4de"
          },
          "paddingTop": {},
          "paddingBottom": {},
          "paddingInlineStart": {},
          "paddingInlineEnd": {},
          "borderStartStartRadius": {
            "defaultValue": "12px"
          },
          "borderStartEndRadius": {
            "defaultValue": "12px"
          },
          "borderEndStartRadius": {
            "defaultValue": "12px"
          },
          "borderEndEndRadius": {
            "defaultValue": "12px"
          },
          "boxShadow": {},
          "width": {
            "defaultValue": "100%"
          },
          "height": {},
          "overflow": {},
          "mixBlendMode": {},
          "marginTop": {},
          "marginBottom": {},
          "marginInlineStart": {},
          "marginInlineEnd": {},
          "display": {
            "display": {
              "displayValues": [
                "none",
                "block"
              ]
            }
          },
          "alignSelf": {}
        }
      }
    }
  },
  "cssProperties": {
    "background": {
      "defaultValue": "#fff"
    },
    "borderTop": {},
    "borderBottom": {},
    "borderInlineStart": {},
    "borderInlineEnd": {},
    "paddingTop": {
      "defaultValue": "24px"
    },
    "paddingBottom": {
      "defaultValue": "24px"
    },
    "paddingInlineStart": {
      "defaultValue": "24px"
    },
    "paddingInlineEnd": {
      "defaultValue": "24px"
    },
    "borderStartStartRadius": {},
    "borderStartEndRadius": {},
    "borderEndStartRadius": {},
    "borderEndEndRadius": {},
    "boxShadow": {},
    "overflow": {},
    "mixBlendMode": {},
    "gap": {
      "defaultValue": "12px"
    },
    "flexDirection": {
      "defaultValue": "column"
    },
    "justifyContent": {},
    "alignItems": {}
  },
  "cssCustomProperties": {
    "accent": {
      "displayName": "Accent",
      "defaultValue": "#196947",
      "cssPropertyType": "color"
    },
    "radius": {
      "displayName": "Radius",
      "defaultValue": "12px",
      "cssPropertyType": "borderRadius"
    }
  }
} as EditorElement;
