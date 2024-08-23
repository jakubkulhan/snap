import {eventAttributePrefix, TemplateResult} from "./template.ts";
import {html} from "./template_html.ts";

const templateAttributeName = "snap:template";

export class SnapElement extends HTMLElement implements EventListenerObject {

    private templateResult: TemplateResult | null = null;
    private updatePromise: Promise<void> | null = null;

    connectedCallback() {
        if (this.templateResult !== null) {
            // already rendered
            return;
        }

        if (this.shadowRoot && this.hasAttribute(templateAttributeName)) {
            this.templateResult = deserializeTemplateResultFromString(this.getAttribute(templateAttributeName)!);

            const walker = document.createTreeWalker(this.shadowRoot, NodeFilter.SHOW_ELEMENT);
            while (walker.nextNode()) {
                const element = walker.currentNode as Element;
                for (const attributeName of element.getAttributeNames()) {
                    if (!attributeName.startsWith(eventAttributePrefix)) {
                        continue;
                    }

                    const eventType = attributeName.substring(eventAttributePrefix.length);
                    element.addEventListener(eventType, this);
                }
            }

        } else {
            if (this.shadowRoot) {
                console.warn(`<${this.localName}> has shadow root, but not ${templateAttributeName} attribute. This results in the shadow root being cleared and element rendered again. Please check that server-side rendering is funtioning correctly.`);
            }

            this.attachShadow({mode: "open"});

            const templateValues = this.render();
            this.templateResult = templateValues.template.insert({
                parentNode: this.shadowRoot,
                values: templateValues.values,
                eventListener: this,
            });
            this.setAttribute(templateAttributeName, serializeTemplateResultToString(this.templateResult));
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        this.requestUpdate().catch(console.error);
    }

    async handleEvent(event: Event): Promise<void> {
        const element = event.currentTarget as Element;
        const handlerName = element.getAttribute(eventAttributePrefix + event.type);
        let handler: () => Promise<boolean | void> | boolean | void;
        if (handlerName === null) {
            throw new Error(`<${element.localName} @${event.type}=\${...}> inside <${this.localName}> is missing ${eventAttributePrefix}${event.type} attribute, so the event cannot be handled.`);
        } else if (handlerName.match(/^\d+$/)) {
            if (this.templateResult.anonymousEventHandlers[handlerName] === undefined) {
                this.update();
                if (this.templateResult.anonymousEventHandlers[handlerName] === undefined) {
                    throw new Error(`<${element.localName} @${event.type}=\${...}> inside <${this.localName}> is an anymous event handler, but even after update the handler is not defined. This is likely a bug in ${this.constructor.name}.render() method.`);
                }
            }
            handler = this.templateResult.anonymousEventHandlers[handlerName];
        } else {
            // @ts-ignore
            handler = this[handlerName];
        }

        if (await handler.call(this, event) !== false) {
            await this.requestUpdate();
        }
    }

    requestUpdate(): Promise<void> {
        if (this.updatePromise !== null) {
            return this.updatePromise;
        }
        return this.updatePromise = new Promise((resolve, reject) => {
            requestAnimationFrame(() => {
                try {
                    this.update();
                    resolve();
                } catch (e) {
                    reject(e);
                } finally {
                    this.updatePromise = null;
                }
            });
        });
    }

    update(): void {
        const templateValues = this.render();
        this.templateResult = templateValues.template.update({
            parentNode: this.shadowRoot,
            values: templateValues.values,
            eventListener: this,
            result: this.templateResult,
        });
        this.setAttribute(templateAttributeName, serializeTemplateResultToString(this.templateResult));
    }

    render() {
        return html``;
    }

}

function deserializeTemplateResultFromString(s: string): TemplateResult {
    return deserializeTemplateResult(s.split(","));
}

function deserializeTemplateResult(data: Array<string>): TemplateResult {
    const hash = data.shift();
    const length = parseInt(data.shift());

    let fragmentResults: ReturnType<typeof deserializeTemplateResult>['fragmentResults'] = {};
    if (data.length > 0) {
        let fragmentIndicesLength = parseInt(data.shift());
        while (fragmentIndicesLength > 0) {
            const fragmentIndex = data.shift();
            const fragmentDataLength = parseInt(data.shift());
            // @ts-ignore
            fragmentResults[fragmentIndex] = deserializeTemplateResult(data.slice(0, fragmentDataLength));
            data = data.slice(fragmentDataLength);
            fragmentIndicesLength--;
        }
    }

    return {
        hash,
        length,
        fragmentResults,
        anonymousEventHandlers: {},
    };
}

function serializeTemplateResultToString(result: TemplateResult): string {
    return serializeTemplateResult(result).join(",");
}

function serializeTemplateResult(result: TemplateResult): Array<string> {
    let data: Array<string> = [result.hash, String(result.length)];
    const fragmentIndices = Object.keys(result.fragmentResults);
    if (fragmentIndices.length > 0) {
        data.push(String(fragmentIndices.length));
        for (const fragmentIndex of fragmentIndices) {
            data.push(fragmentIndex);
            // @ts-ignore
            const fragmentData = serializeTemplateResult(result.fragmentResults[fragmentIndex]);
            data.push(String(fragmentData.length));
            data = data.concat(fragmentData)
        }
    }
    return data;
}
