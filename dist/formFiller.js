async function callLLMForTwoItems(pageText) {
    const key = process.env.OPENAI_API_KEY;
    if (!key)
        return [];
    try {
        const prompt = `You are given the visible text of a web page. Extract two short items (article titles, people names, or keywords) that a user might search or fill on this page. Return a JSON array with exactly two strings, no explanation.`;
        const body = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Extract two items from the page text' },
                { role: 'user', content: `${prompt}\n\nPAGE_TEXT:\n${pageText.slice(0, 15000)}` }
            ],
            temperature: 0.2,
            max_tokens: 200
        };
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify(body)
        });
        const j = await res.json();
        const text = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || '';
        // try to parse JSON from response
        const m = text.match(/\[.*\]/s);
        let arr = [];
        if (m) {
            try {
                arr = JSON.parse(m[0]);
            }
            catch (e) { }
        }
        if (!arr.length) {
            // fallback: extract lines
            const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            arr = lines.slice(0, 2).map((s) => s.replace(/^[-\d\.\)\s]+/, '')).slice(0, 2);
        }
        return arr.slice(0, 2);
    }
    catch (e) {
        return [];
    }
}
export async function fillAndSubmitIfForm(page, el, profile, suggestedItems) {
    // If a form surrounds `el`, try to fill common fields. If suggestedItems are not provided,
    // call an LLM to extract two candidate items from the page visible text.
    try {
        const formHandle = await page.evaluateHandle((e) => {
            let p = e;
            while (p && p.nodeName !== 'FORM')
                p = p.parentElement;
            return p;
        }, el);
        const isForm = await page.evaluate((f) => !!f, formHandle);
        if (!isForm)
            return { filled: false, usedItems: [] };
        let items = suggestedItems && suggestedItems.length ? suggestedItems : [];
        if (!items.length) {
            // get visible text and call LLM
            const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
            items = await callLLMForTwoItems(pageText);
        }
        // find up to two text inputs in the form that are empty
        const inputSelectors = await page.evaluate((form) => {
            const f = form;
            const inputs = Array.from(f.querySelectorAll('input[type="text"], input:not([type]), textarea, input[type="search"])'));
            return inputs.map((i) => {
                return { selector: i.getAttribute('name') ? `input[name="${i.getAttribute('name')}"]` : (i.getAttribute('id') ? `#${i.getAttribute('id')}` : null), placeholder: i.getAttribute('placeholder') };
            }).filter(s => s.selector);
        }, formHandle);
        const used = [];
        for (let i = 0; i < Math.min(2, items.length); i++) {
            const sel = inputSelectors[i] && inputSelectors[i].selector;
            if (sel) {
                try {
                    await page.fill(sel, items[i]);
                    used.push(items[i]);
                }
                catch (e) { }
            }
        }
        // submit the form if a submit button exists
        try {
            await page.click('button[type="submit"], input[type="submit"]');
        }
        catch (e) { }
        return { filled: used.length > 0, usedItems: used };
    }
    catch (e) {
        return { filled: false, usedItems: [] };
    }
}
