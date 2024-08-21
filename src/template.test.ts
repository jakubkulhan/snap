import {assert} from "@esm-bundle/chai";
import {html} from "./template_html.ts";

describe("Template", () => {
    class EventHandler implements EventListenerObject {
        public events: Array<Event> = [];

        handleEvent(event: Event): void {
            this.events.push(event);
        }

        handleClick(event: Event): void {
            throw new Error("This method should not be called.");
        }
    }

    const eventHandler = new EventHandler();

    const insertTestCases: {
        [key: string]: {
            render: ReturnType<typeof html>,
            innerHTML: string,
            eventListener?: EventListenerObject,
            assertDOM?: (parentNode: Element) => void,
        }
    } = {
        "empty string": {
            render: html``,
            innerHTML: ``,
        },
        "text": {
            render: html`text`,
            innerHTML: `text`,
        },
        "string value": {
            render: html`${"string"}`,
            innerHTML: `string`,
        },
        "integer value": {
            render: html`${1}`,
            innerHTML: `1`,
        },
        "float value": {
            render: html`${3.14}`,
            innerHTML: `3.14`,
        },
        "true value": {
            render: html`${true}`,
            innerHTML: `true`,
        },
        "false value": {
            render: html`${false}`,
            innerHTML: `<!---->`,
        },
        "null value": {
            render: html`${null}`,
            innerHTML: `<!---->`,
        },
        "undefined value": {
            render: html`${undefined}`,
            innerHTML: `undefined`,
        },
        "html value": {
            render: html`${html`html text`}`,
            innerHTML: `html text`,
        },
        "html value with multiple nodes": {
            render: html`before ${html`<i>a</i><b>b</b>`} after`,
            innerHTML: `before <i>a</i><b>b</b> after`,
        },
        "multiple html values with multiple nodes": {
            render: html`before ${html`<i>a</i><i>b</i>`} inside ${html`<i>c</i><i>d</i>`} after`,
            innerHTML: `before <i>a</i><i>b</i> inside <i>c</i><i>d</i> after`,
        },
        "multiple html values with multiple nodes in nested element": {
            render: html`<div>before ${html`<i>a</i><i>b</i>`} inside ${html`<i>c</i><i>d</i>`} another inside ${html`<i>e</i><i>f</i>`} after</div>`,
            innerHTML: `<div>before <i>a</i><i>b</i> inside <i>c</i><i>d</i> another inside <i>e</i><i>f</i> after</div>`,
        },
        "multiple html values with no node": {
            render: html`before ${html``} inside ${html`<i>c</i><i>d</i>`} after`,
            innerHTML: `before <!----> inside <i>c</i><i>d</i> after`,
        },
        "attribute with string value only": {
            render: html`<div data-attr=${"string"}></div>`,
            innerHTML: `<div data-attr="string"></div>`,
        },
        "attribute with integer value only": {
            render: html`<div data-attr=${1}></div>`,
            innerHTML: `<div data-attr="1"></div>`,
        },
        "attribute with float value only": {
            render: html`<div data-attr=${3.14}></div>`,
            innerHTML: `<div data-attr="3.14"></div>`,
        },
        "attribute with true value only": {
            render: html`<div data-attr=${true}></div>`,
            innerHTML: `<div data-attr=""></div>`,
        },
        "attribute with false value only": {
            render: html`<div data-attr=${false}></div>`,
            innerHTML: `<div></div>`,
        },
        "attribute with null value only": {
            render: html`<div data-attr=${null}></div>`,
            innerHTML: `<div data-attr="null"></div>`,
        },
        "attribute with undefined value only": {
            render: html`<div data-attr=${undefined}></div>`,
            innerHTML: `<div data-attr="undefined"></div>`,
        },
        "attribute with prefix": {
            render: html`<div data-attr="before ${"string"}"></div>`,
            innerHTML: `<div data-attr="before string"></div>`,
        },
        "attribute with suffix": {
            render: html`<div data-attr="${"string"} after"></div>`,
            innerHTML: `<div data-attr="string after"></div>`,
        },
        "attribute with multiple values": {
            render: html`<div data-attr="before ${"first"} inside ${"second"} after"></div>`,
            innerHTML: `<div data-attr="before first inside second after"></div>`,
        },
        "event listener with a named method": {
            render: html`<button @click=${eventHandler.handleClick}>click me</button>`,
            innerHTML: `<button snap:onclick="handleClick">click me</button>`,
            eventListener: new EventHandler(),
            assertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
        },
        "event listener with a closure": {
            render: html`<button @click=${() => {}}>click me</button>`,
            innerHTML: `<button snap:onclick="0">click me</button>`,
            eventListener: new EventHandler(),
            assertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
        },
    };

    for (const testCaseName in insertTestCases) {
        const testCase = insertTestCases[testCaseName];

        it(`insert ${testCaseName}`, () => {
            const parentNode = document.createElement("div");
            testCase.render.template.insert({parentNode, values: testCase.render.values, eventListener: testCase.eventListener});
            assert.equal(parentNode.innerHTML, testCase.innerHTML);
            if (testCase.assertDOM) {
                testCase.assertDOM(parentNode);
            }
        });
    }

    const updateTestCases: {
        [key: string]: {
            render(data: any): ReturnType<typeof html>,
            insertData?: any,
            updateData?: any,
            nextUpdateData?: any,
            innerHTML: string,
            eventListener?: EventListenerObject,
            insertAssertDOM?: (parentNode: Element) => void,
            updateAssertDOM?: (parentNode: Element) => void,
        },
    } = {
        "the same empty template": {
            render() {
                return html``;
            },
            innerHTML: ``,
        },
        "to a different empty template": {
            render(initial) {
                if (initial) {
                    return html``;
                } else {
                    return html``;
                }
            },
            insertData: true,
            updateData: false,
            innerHTML: ``,
        },
        "to a different text template": {
            render(initial) {
                if (initial) {
                    return html`insert`;
                } else {
                    return html`update`;
                }
            },
            insertData: true,
            updateData: false,
            innerHTML: `update`,
        },
        "to a different HTML template": {
            render(initial) {
                if (initial) {
                    return html`<span>foo</span>${" "}<u>bar</u>`;
                } else {
                    return html`<b>hello</b>${" "}<i>world</i>`;
                }
            },
            insertData: true,
            updateData: false,
            innerHTML: `<b>hello</b> <i>world</i>`,
        },
        "string value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: "insert",
            updateData: "update",
            innerHTML: `<span>update</span>`,
        },
        "integer value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: 1,
            updateData: 2,
            innerHTML: `<span>2</span>`,
        },
        "float value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: 3.14,
            updateData: 2.71828,
            innerHTML: `<span>2.71828</span>`,
        },
        "true value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: 1,
            updateData: true,
            innerHTML: `<span>true</span>`,
        },
        "false value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: 1,
            updateData: false,
            innerHTML: `<span><!----></span>`,
        },
        "null value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: 1,
            updateData: null,
            innerHTML: `<span><!----></span>`,
        },
        "undefined value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: 1,
            updateData: undefined,
            innerHTML: `<span>undefined</span>`,
        },
        "null to string value": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: null,
            updateData: "string",
            innerHTML: `<span>string</span>`,
        },
        "html value with different templates": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: html`<b>insert</b>`,
            updateData: html`<i>update</i>`,
            innerHTML: `<span><i>update</i></span>`,
        },
        "html value to string": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: html`<b>insert</b>`,
            updateData: "string",
            innerHTML: `<span>string</span>`,
        },
        "string value to html": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: "insert",
            updateData: html`<b>update</b>`,
            innerHTML: `<span><b>update</b></span>`,
        },
        "html value with different values": {
            render(v) {
                return html`<span>before ${html`<b>${v}</b>`} after</span>`;
            },
            insertData: "insert",
            updateData: "update",
            innerHTML: `<span>before <b>update</b> after</span>`,
        },
        "attribute with string value": {
            render(v) {
                return html`<div data-attr="${v}"></div>`;
            },
            insertData: "insert",
            updateData: "update",
            innerHTML: `<div data-attr="update"></div>`,
        },
        "string to html to string": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: "string",
            updateData: html`<b>update</b>`,
            nextUpdateData: "next string",
            innerHTML: `<span>next string</span>`,
        },
        "string to html to nothing": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: "string",
            updateData: html`<b>update</b>`,
            nextUpdateData: null,
            innerHTML: `<span><!----></span>`,
        },
        "string to nothing to html": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: "string",
            updateData: null,
            nextUpdateData: html`<b>next</b>`,
            innerHTML: `<span><b>next</b></span>`,
        },
        "nothing to string to html": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: null,
            updateData: "string",
            nextUpdateData: html`<b>next</b>`,
            innerHTML: `<span><b>next</b></span>`,
        },
        "nothing to html to string": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: null,
            updateData: html`<b>update</b>`,
            nextUpdateData: "next string",
            innerHTML: `<span>next string</span>`,
        },
        "html to string to nothing": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: html`<b>insert</b>`,
            updateData: "string",
            nextUpdateData: null,
            innerHTML: `<span><!----></span>`,
        },
        "html to nothing to string": {
            render(v) {
                return html`<span>${v}</span>`;
            },
            insertData: html`<b>insert</b>`,
            updateData: null,
            nextUpdateData: "next string",
            innerHTML: `<span>next string</span>`,
        },
        "sibling html values": {
            render({first, second}) {
                return html`before (${first}) between (${second}) after`;
            },
            insertData: {first: html`<b>insert</b> with text`, second: html`<i>italic</i>`},
            updateData: {first: html`update`, second: html`text and <b>update</b>`},
            innerHTML: `before (update) between (text and <b>update</b>) after`,
        },
        "event listener with a named method": {
            render() {
                return html`<button @click=${eventHandler.handleClick}>click me</button>`;
            },
            insertData: null,
            updateData: null,
            innerHTML: `<button snap:onclick="handleClick">click me</button>`,
            eventListener: new EventHandler(),
            insertAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
            updateAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 2);
            },
        },
        "event listener with a closure": {
            render() {
                return html`<button @click=${() => {}}>click me</button>`;
            },
            insertData: null,
            updateData: null,
            innerHTML: `<button snap:onclick="0">click me</button>`,
            eventListener: new EventHandler(),
            insertAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
            updateAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 2);
            },
        },
        "event listener from something to null": {
            render(handleClick) {
                return html`<button @click=${handleClick}>click me</button>`;
            },
            insertData: eventHandler.handleClick,
            updateData: null,
            innerHTML: `<button>click me</button>`,
            eventListener: new EventHandler(),
            insertAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
            updateAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
        },
        "event listener from null to something": {
            render(handleClick) {
                return html`<button @click=${handleClick}>click me</button>`;
            },
            insertData: null,
            updateData: eventHandler.handleClick,
            innerHTML: `<button snap:onclick="handleClick">click me</button>`,
            eventListener: new EventHandler(),
            insertAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 0);
            },
            updateAssertDOM(parentNode) {
                parentNode.querySelector("button").click();
                assert.equal(this.eventListener.events.length, 1);
            },
        },
    };

    for (const testCaseName in updateTestCases) {
        const testCase = updateTestCases[testCaseName];

        it(`update ${testCaseName}`, () => {
            const parentNode = document.createElement("div");
            let templateValues = testCase.render(testCase.insertData);

            let result = templateValues.template.insert({parentNode, values: templateValues.values, eventListener: testCase.eventListener});
            if (testCase.insertAssertDOM) {
                testCase.insertAssertDOM(parentNode);
            }

            templateValues = testCase.render(testCase.updateData)
            result = templateValues.template.update({parentNode, values: templateValues.values, eventListener: testCase.eventListener, result: result});
            if (testCase.updateAssertDOM) {
                testCase.updateAssertDOM(parentNode);
            }

            if (testCase.nextUpdateData !== undefined) {
                templateValues = testCase.render(testCase.nextUpdateData);
                result = templateValues.template.update({parentNode, values: templateValues.values, eventListener: testCase.eventListener, result: result});
            }
            assert.equal(parentNode.innerHTML, testCase.innerHTML);
        });
    }
});
