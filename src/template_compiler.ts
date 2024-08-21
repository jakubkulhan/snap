const markerPrefix = `$marker$${Math.random().toString(36).substring(2)}$`;
const markerRegex = new RegExp(markerPrefix.replace(/\$/g, "\\$") + "(\\d+)\\$");

export type Path = number[];
export type FragmentValue = { path: Path, valueIndex: number };
export type AttributeValue = { path: Path, name: string, valueIndicesAndStrings: Array<string | number> };
export type EventListenerValue = { path: Path, name: string, valueIndex: number };

export class Compiler {
    template: HTMLTemplateElement;
    fragmentValues: FragmentValue[] = [];
    attributeValues: AttributeValue[] = [];
    eventListenerValues: EventListenerValue[] = [];

    constructor(strings: ReadonlyArray<string>) {
        let markedHTML = strings[0];
        for (let i = 0; i < strings.length - 1; i++) {
            markedHTML += `${markerPrefix}${i}$${strings[i + 1]}`;
        }

        this.template = document.createElement("template");
        this.template.innerHTML = markedHTML;
    }

    compile() {
        this.removeWhitespaceTextNodes(this.template.content);
        this.compileNode(this.template.content, []);
    }

    private compileNode(node: Node, path: Path) {
        if (node.nodeType === Node.TEXT_NODE) {
            this.compileTextNode(node as Text, path);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.compileElementNode(node as Element, path);
        }

        for (let i = 0; i < node.childNodes.length; i++) {
            this.compileNode(node.childNodes[i], path.concat(i));
        }
    }

    private compileTextNode(node: Text, path: Path) {
        let match: RegExpExecArray = markerRegex.exec(node.textContent);

        if (match === null) {
            return;
        }

        const prefix = node.textContent.substring(0, match.index);
        const suffix = node.textContent.substring(match.index + match[0].length);
        if (prefix === "") {
            node.textContent = suffix;
            const dynamicText = document.createComment("");
            node.parentNode.insertBefore(dynamicText, node);
            if (suffix === "") {
                node.parentNode.removeChild(node);
            }
        } else {
            node.textContent = prefix;
            const dynamicText = document.createComment("");
            node.parentNode.insertBefore(dynamicText, node.nextSibling);
            path[path.length - 1]++;
            if (suffix !== "") {
                node.parentNode.insertBefore(document.createTextNode(suffix), dynamicText.nextSibling);
            }
        }

        this.fragmentValues.push({path, valueIndex: parseInt(match[1])})
    }

    private compileElementNode(node: Element, path: Path) {
        for (const attributeName of node.getAttributeNames()) {
            let attributeValue = node.getAttribute(attributeName);
            let match: RegExpExecArray;
            const valueIndicesAndStrings = [];
            while (null !== (match = markerRegex.exec(attributeValue))) {
                const prefix = attributeValue.substring(0, match.index);
                attributeValue = attributeValue.substring(match.index + match[0].length);
                if (prefix.length > 0) {
                    valueIndicesAndStrings.push(prefix);
                }
                valueIndicesAndStrings.push(parseInt(match[1]));
            }
            if (attributeValue !== "") {
                valueIndicesAndStrings.push(attributeValue);
            }

            if (attributeName.match(/^@/)) {
                node.removeAttribute(attributeName);
                if (valueIndicesAndStrings.length !== 1 || typeof valueIndicesAndStrings[0] !== "number") {
                    throw new Error(`Event listener assignment like <${node.localName} ${attributeName}="${valueIndicesAndStrings.map(part => typeof part === "number" ? '${...}' : part).join("")}"> is not valid. You must use only a single dynamic value like <${node.localName} ${attributeName}="\${...}">.`);
                } else {
                    this.eventListenerValues.push({
                        path,
                        name: attributeName.substring(1),
                        valueIndex: valueIndicesAndStrings[0]
                    });
                }

            } else if (valueIndicesAndStrings.length > 1 || typeof valueIndicesAndStrings[0] === "number") {
                node.setAttribute(attributeName, "");
                this.attributeValues.push({path, name: attributeName, valueIndicesAndStrings: valueIndicesAndStrings});
            }
        }
    }

    private removeWhitespaceTextNodes(node: Node): boolean {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.previousSibling === null) {
                node.textContent = node.textContent.trimStart();
            } else {
                node.textContent = node.textContent.replace(/^\s+/, " ");
            }
            if (node.nextSibling === null) {
                node.textContent = node.textContent.trimEnd();
            } else {
                node.textContent = node.textContent.replace(/\s+$/, " ");
            }
            if (node.textContent === "" ||
                (node.textContent === " " &&
                    node.previousSibling !== null &&
                    node.previousSibling instanceof Element &&
                    node.nextSibling !== null &&
                    node.nextSibling instanceof Element)
            ) {
                node.parentNode.removeChild(node);
                return false;
            }
        }

        for (let i = 0; i < node.childNodes.length;) {
            if (this.removeWhitespaceTextNodes(node.childNodes[i])) {
                i++;
            }
        }

        return true;
    }
}
