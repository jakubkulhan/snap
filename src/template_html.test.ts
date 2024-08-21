import {assert} from "@esm-bundle/chai";
import {html} from "./template_html.ts";

describe("html", () => {
    it("caches compiled templates", () => {
        function render() {
            return html`<div>${0}</div>`;
        }

        const template1 = render();
        const template2 = render();
        assert(template1 !== template2);
        assert(template1.template === template2.template);
    });

    it("caches compiled templates with different values", () => {
        function render(value: number) {
            return html`<div>${value}</div>`;
        }

        const template1 = render(1);
        const template2 = render(2);
        assert(template1 !== template2);
        assert(template1.template === template2.template);
    });

    it("caches empty template created in different places", () => {
        function render(initial: boolean) {
            if (initial) {
                return html``;
            } else {
                return html``;
            }
        }

        const template1 = render(true);
        const template2 = render(false);
        assert(template1 !== template2);
        assert(template1.template === template2.template);
    });

    it("caches template with the same template strings created in different places", () => {
        function render(initial: boolean) {
            if (initial) {
                return html`<div>foo</div>`;
            } else {
                return html`<div>foo</div>`;
            }
        }

        const template1 = render(true);
        const template2 = render(false);
        assert(template1 !== template2);
        assert(template1.template === template2.template);
    });
});
