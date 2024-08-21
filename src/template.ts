import {AttributeValue, EventListenerValue, FragmentValue, Path} from "./template_compiler.ts";

function tryFindMethodName(object: object, value: any): string | null {
    while (object !== null && object !== Object.prototype) {
        const propertyDescriptors = Object.getOwnPropertyDescriptors(object);
        for (const name in propertyDescriptors) {
            if (propertyDescriptors[name].value === value) {
                return name;
            }
        }
        object = Object.getPrototypeOf(object);
    }
    return null;
}

export class Template {
    constructor(
        public readonly hash: string,
        private templateFragment: DocumentFragment,
        private fragmentValues: Array<FragmentValue>,
        private attributeValues: Array<AttributeValue>,
        private eventListenerValues: Array<EventListenerValue>,
    ) {}

    insert({parentNode, referenceNode = null, values, eventListener}: TemplateInsertOptions): TemplateResult {
        parentNode.insertBefore(this.templateFragment.cloneNode(true), referenceNode?.nextSibling);
        const zeroNode = referenceNode?.nextSibling ?? parentNode.firstChild;

        const offsets: TemplateOffsets = {};
        const fragmentResults: TemplateFragmentResults = {};
        for (let i = 0; i < this.fragmentValues.length; i++) {
            const fragmentValue = this.fragmentValues[i];
            const value = values[fragmentValue.valueIndex];
            const valueNode = this.findNodeAtPath(zeroNode, fragmentValue.path, offsets);
            if (value instanceof TemplateValues) {
                const fragmentResult = value.template.insert({
                    parentNode: valueNode.parentNode,
                    referenceNode: valueNode,
                    values: value.values,
                    eventListener,
                });
                fragmentResults[i] = fragmentResult;
                if (fragmentResult.length >= 0) {
                    const offsetsKey = fragmentValue.path.slice(0, fragmentValue.path.length - 1).join(".");
                    if (! (offsetsKey in offsets)) {
                        offsets[offsetsKey] = 0
                    }
                    offsets[offsetsKey] += fragmentResult.length;
                    valueNode.parentNode.removeChild(valueNode);
                }

            } else {
                const valueAsString = value === false || value === null ? "" : String(value);
                if (valueAsString !== "") {
                    valueNode.parentNode.insertBefore(document.createTextNode(valueAsString), valueNode);
                    valueNode.parentNode.removeChild(valueNode);
                }
            }
        }

        this.setAttributes(zeroNode, offsets, values);

        if (this.eventListenerValues.length > 0 && !eventListener) {
            throw new Error("Template contains event listeners, you have to provide eventListener parameter.");
        }
        const anonymousEventHandlers = this.setEventHandlers(zeroNode, offsets, values, eventListener);

        return {
            hash: this.hash,
            length: this.templateFragment.childNodes.length + (offsets[""] ?? 0) - 1,
            fragmentResults,
            anonymousEventHandlers,
        };
    }

    update({parentNode, referenceNode = null, values, eventListener, result}: TemplateUpdateOptions): TemplateResult {
        if (result.hash !== this.hash) {
            this.destroy(parentNode, referenceNode, result);
            return this.insert({parentNode, referenceNode, values, eventListener});
        }

        const zeroNode = referenceNode?.nextSibling ?? parentNode.firstChild;

        const offsets: TemplateOffsets = {};
        const fragmentResults: TemplateFragmentResults = {};
        for (let i = 0; i < this.fragmentValues.length; i++) {
            const fragmentValue = this.fragmentValues[i];
            const previousFragmentResult = result.fragmentResults[i] ?? null;

            const value = values[fragmentValue.valueIndex];
            let valueNode = this.findNodeAtPath(zeroNode, fragmentValue.path, offsets);

            if (value instanceof TemplateValues) {
                let fragmentResult: TemplateResult;
                if (previousFragmentResult === null) {
                    fragmentResult = value.template.insert({
                        parentNode: valueNode.parentNode,
                        referenceNode: valueNode,
                        values: value.values,
                    });

                } else {
                    const commentNode = document.createComment("");
                    valueNode.parentNode.insertBefore(commentNode, valueNode);
                    fragmentResult = value.template.update({
                        parentNode: valueNode.parentNode,
                        referenceNode: valueNode.previousSibling,
                        values: value.values,
                        eventListener,
                        result: previousFragmentResult,
                    });
                    valueNode = commentNode;
                }

                fragmentResults[i] = fragmentResult;
                if (fragmentResult.length >= 0) {
                    const offsetsKey = fragmentValue.path.slice(0, fragmentValue.path.length - 1).join(".");
                    if (! (offsetsKey in offsets)) {
                        offsets[offsetsKey] = 0;
                    }
                    offsets[offsetsKey] += fragmentResult.length;
                    valueNode.parentNode.removeChild(valueNode);
                } else if (valueNode.nodeType !== Node.COMMENT_NODE) {
                    valueNode.parentNode.insertBefore(document.createComment(""), valueNode);
                    valueNode.parentNode.removeChild(valueNode);
                }

            } else {
                if (previousFragmentResult !== null) {
                    const commentNode = document.createComment("");
                    valueNode.parentNode.insertBefore(commentNode, valueNode);
                    this.destroy(valueNode.parentNode, commentNode, previousFragmentResult);
                    valueNode = commentNode;
                }

                const valueAsString = value === false || value === null ? "" : String(value);
                if (valueAsString === "" && valueNode.nodeType !== Node.COMMENT_NODE) {
                    valueNode.parentNode.insertBefore(document.createComment(""), valueNode);
                    valueNode.parentNode.removeChild(valueNode);
                } else if (valueAsString !== "") {
                    if (valueNode.nodeType === Node.COMMENT_NODE) {
                        valueNode.parentNode.insertBefore(document.createTextNode(valueAsString), valueNode);
                        valueNode.parentNode.removeChild(valueNode);
                    } else if (valueNode.textContent !== valueAsString) {
                        valueNode.textContent = valueAsString;
                    }
                }
            }
        }

        this.setAttributes(zeroNode, offsets, values);

        if (this.eventListenerValues.length > 0 && !eventListener) {
            throw new Error("Template contains event listeners, you have to provide eventListener parameter.");
        }
        const anonymousEventHandlers = this.setEventHandlers(zeroNode, offsets, values, eventListener);

        return {
            hash: this.hash,
            length: this.templateFragment.childNodes.length + (offsets[""] ?? 0) - 1,
            fragmentResults,
            anonymousEventHandlers,
        };
    }

    private setAttributes(zeroNode: ChildNode, offsets: TemplateOffsets, values: Values) {
        for (const attributeValue of this.attributeValues) {
            let value;
            if (attributeValue.valueIndicesAndStrings.length === 1 && typeof attributeValue.valueIndicesAndStrings[0] === "number" && typeof values[attributeValue.valueIndicesAndStrings[0]] === "boolean") {
                value = values[attributeValue.valueIndicesAndStrings[0]];
            } else {
                value = attributeValue.valueIndicesAndStrings.map(part => typeof part === "number" ? String(values[part]) : part).join("");
            }
            const valueNode = this.findNodeAtPath(zeroNode, attributeValue.path, offsets) as Element;
            if (typeof value === "boolean") {
                if (value && valueNode.getAttribute(attributeValue.name) !== "") {
                    valueNode.setAttribute(attributeValue.name, "");
                } else if (!value && valueNode.hasAttribute(attributeValue.name)) {
                    valueNode.removeAttribute(attributeValue.name);
                }
            } else if (valueNode.getAttribute(attributeValue.name) !== value) {
                valueNode.setAttribute(attributeValue.name, value);
            }
        }
    }

    private setEventHandlers(zeroNode: ChildNode, offsets: TemplateOffsets, values: Values, eventListener: EventListenerObject): TemplateAnonymousEventHandlers {
        const anonymousEventHandlers: TemplateAnonymousEventHandlers = {};
        for (const eventListenerValue of this.eventListenerValues) {
            const value = values[eventListenerValue.valueIndex];
            const valueNode = this.findNodeAtPath(zeroNode, eventListenerValue.path, offsets) as Element;
            const attributeName = eventAttributePrefix + eventListenerValue.name;

            if (value) {
                let methodName = tryFindMethodName(eventListener, value);
                if (methodName === null) {
                    methodName = String(eventListenerValue.valueIndex);
                    anonymousEventHandlers[methodName] = value;
                }
                if (!valueNode.hasAttribute(attributeName)) {
                    valueNode.setAttribute(attributeName, methodName);
                    valueNode.addEventListener(eventListenerValue.name, eventListener);
                } else if (valueNode.getAttribute(attributeName) !== methodName) {
                    valueNode.setAttribute(attributeName, methodName);
                }
            } else if (valueNode.hasAttribute(attributeName)) {
                valueNode.removeAttribute(attributeName);
                valueNode.removeEventListener(eventListenerValue.name, eventListener);
            }
        }
        return anonymousEventHandlers;
    }

    private findNodeAtPath(node: Node, path: Path, offsets: TemplateOffsets): Node {
        for (let i = path[0] + (offsets[""] ?? 0); i > 0; i--) {
            node = node.nextSibling;
        }
        for (let i = 1; i < path.length; i++) {
            node = node.childNodes[path[i] + (offsets[path.slice(0, i).join(".")] ?? 0)];
        }
        return node;
    }

    private destroy(parentNode: Node, referenceNode: Node | null, result: TemplateResult) {
        let l = result.length;
        let node = referenceNode?.nextSibling ?? parentNode.firstChild;
        while (l-- >= 0) {
            const tmp = node.nextSibling;
            parentNode.removeChild(node);
            node = tmp;
        }
    }
}

export const eventAttributePrefix = "snap:on"

type TemplateInsertOptions = {
    parentNode: Node,
    referenceNode?: Node,
    values: Values,
    eventListener?: EventListenerObject,
};

type TemplateUpdateOptions = TemplateInsertOptions & {
    result: TemplateResult,
};

type TemplateOffsets = {[key: string]: number};

type TemplateFragmentResults = {[fragmentIndex: number]: TemplateResult};

type TemplateAnonymousEventHandlers = {[methodName: string]: any};

export type TemplateResult = {
    hash: string,
    length: number,
    fragmentResults: TemplateFragmentResults,
    anonymousEventHandlers: TemplateAnonymousEventHandlers,
};

export type Values = any[];

export class TemplateValues {
    constructor(
        public template: Template,
        public values: Values,
    ) {}
}
