// src/utils/dom-util.ts
var removeChildren = (parentElement) => {
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }
  return parentElement;
};
export {
  removeChildren
};
//# sourceMappingURL=dom-util.js.map
