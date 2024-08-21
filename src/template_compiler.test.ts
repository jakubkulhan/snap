import {assert} from "@esm-bundle/chai";
import {AttributeValue, Compiler, EventListenerValue, FragmentValue} from "./template_compiler.ts";

function strs(strings: TemplateStringsArray, ...values: any[]) {
    return strings;
}

describe("Compiler", () => {
    const validTestCases: {
        [testName: string]: {
            strings: ReadonlyArray<string>,
            html: string,
            childNodesLength?: number,
            fragmentValues?: Array<FragmentValue>,
            attributeValues?: Array<AttributeValue>,
            eventListenerValues?: Array<EventListenerValue>,
        },
    } = {
        "fragment": {
            strings: strs`${0}`,
            html: "<!---->",
            childNodesLength: 1,
            fragmentValues: [
                {path: [0], valueIndex: 0},
            ],
        },
        "fragment with prefix": {
            strings: strs`prefix${0}`,
            html: "prefix<!---->",
            childNodesLength: 2,
            fragmentValues: [
                {path: [1], valueIndex: 0},
            ],
        },
        "fragment with suffix": {
            strings: strs`${0}suffix`,
            html: "<!---->suffix",
            childNodesLength: 2,
            fragmentValues: [
                {path: [0], valueIndex: 0}
            ],
        },
        "fragment with both prefix and suffix": {
            strings: strs`prefix${0}suffix`,
            html: "prefix<!---->suffix",
            childNodesLength: 3,
            fragmentValues: [
                {path: [1], valueIndex: 0}
            ],
        },
        "fragment in nested element": {
            strings: strs`<div>${0}</div>`,
            html: "<div><!----></div>",
            childNodesLength: 1,
            fragmentValues: [
                {path: [0, 0], valueIndex: 0},
            ],
        },
        "attribute": {
            strings: strs`<div class="${0}"></div>`,
            html: '<div class=""></div>',
            attributeValues: [
                {path: [0], name: "class", valueIndicesAndStrings: [0]},
            ],
        },
        "attribute with prefix": {
            strings: strs`<div class="prefix${0}"></div>`,
            html: '<div class=""></div>',
            attributeValues: [
                {path: [0], name: "class", valueIndicesAndStrings: ["prefix", 0]},
            ],
        },
        "attribute with suffix": {
            strings: strs`<div class="${0}suffix"></div>`,
            html: '<div class=""></div>',
            attributeValues: [
                {path: [0], name: "class", valueIndicesAndStrings: [0, "suffix"]},
            ],
        },
        "attribute with both prefix and suffix": {
            strings: strs`<div class="prefix${0}suffix"></div>`,
            html: '<div class=""></div>',
            attributeValues: [
                {path: [0], name: "class", valueIndicesAndStrings: ["prefix", 0, "suffix"]},
            ],
        },
        "attribute with multiple values": {
            strings: strs`<div class="${0}${1}"></div>`,
            html: '<div class=""></div>',
            attributeValues: [
                {path: [0], name: "class", valueIndicesAndStrings: [0, 1]},
            ],
        },
        "attribute with multiple values and static parts": {
            strings: strs`<div class="prefix${0}infix${1}suffix"></div>`,
            html: '<div class=""></div>',
            attributeValues: [
                {path: [0], name: "class", valueIndicesAndStrings: ["prefix", 0, "infix", 1, "suffix"]},
            ],
        },
        "attribute in nested element": {
            strings: strs`<div>text<span class="${0}"></span></div>`,
            html: '<div>text<span class=""></span></div>',
            attributeValues: [
                {path: [0, 1], name: "class", valueIndicesAndStrings: [0]},
            ],
        },
        "event listener": {
            strings: strs`<div @click="${0}"></div>`,
            html: '<div></div>',
            eventListenerValues: [
                {path: [0], name: "click", valueIndex: 0},
            ],
        },
        "event listener in nested element": {
            strings: strs`<div><button @click="${0}">btn</button>text</div>`,
            html: '<div><button>btn</button>text</div>',
            eventListenerValues: [
                {path: [0, 0], name: "click", valueIndex: 0}
            ],
        },
        "whitespace removal": {
            strings: strs`   a    `,
            html: `a`,
            childNodesLength: 1,
        },
        "whitespace removal keeps a space before tag": {
            strings: strs`   a    <i>   b   </i>`,
            html: `a <i>b</i>`,
            childNodesLength: 2,
        },
        "whitespace removal doesn't add a space before tag": {
            strings: strs`    a<i>b</i>`,
            html: `a<i>b</i>`,
            childNodesLength: 2,
        },
        "whitespace removal keeps a space after tag": {
            strings: strs`    <i>    a </i>   b     `,
            html: `<i>a</i> b`,
            childNodesLength: 2,
        },
        "whitespace removal doesn't add a space after tag": {
            strings: strs`   <i>   a </i>b     `,
            html: `<i>a</i>b`,
            childNodesLength: 2,
        },
        "whitespace removal doesn't keep a space between inline tags": {
            strings: strs`    <i>a</i>     <i>   b </i>`,
            html: `<i>a</i><i>b</i>`,
            childNodesLength: 2,
        },
        "whitespace removal doesn't keep a space between block tags": {
            strings: strs`   <div>  a </div>   <div>  b </div>`,
            html: `<div>a</div><div>b</div>`,
            childNodesLength: 2,
        },
    };

    const invalidTestCases: {
        [testName: string]: {
            strings: ReadonlyArray<string>,
            error: string,
        },
    } = {
        "invalid event listener": {
            strings: strs`<div @click="blah ${0}"></div>`,
            error: 'Event listener assignment like <div @click="blah ${...}"> is not valid. You must use only a single dynamic value like <div @click="${...}">.'
        },
    };

    for (const testCaseName in validTestCases) {
        const testCase = validTestCases[testCaseName];

        it(`compile ${testCaseName}`, () => {
            const compiler = new Compiler(testCase.strings);
            compiler.compile();
            assert.equal(compiler.template.innerHTML, testCase.html);
            if (testCase.childNodesLength !== undefined) {
                assert.equal(compiler.template.content.childNodes.length, testCase.childNodesLength);
            }
            assert.deepEqual(compiler.fragmentValues, testCase.fragmentValues ?? []);
            assert.deepEqual(compiler.attributeValues, testCase.attributeValues ?? []);
            assert.deepEqual(compiler.eventListenerValues, testCase.eventListenerValues ?? []);
        });
    }

    for (const testCaseName in invalidTestCases) {
        const testCase = invalidTestCases[testCaseName];

        it(`compile throws an exception for ${testCaseName}`, () => {
            const compiler = new Compiler(testCase.strings);
            assert.throws(() => compiler.compile(), testCase.error);
        });
    }
});
