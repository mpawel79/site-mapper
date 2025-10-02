export async function extractActions(page) {
    // returns simple list of { selector, name }
    const actions = [];
    // Use a simpler approach - get all clickable elements with their basic info
    const candidates = await page.$$('[href], button, [role="button"], input[type="submit"], a');
    console.log(`Found ${candidates.length} candidate elements`);
    for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        try {
            const text = (await el.innerText()).trim().slice(0, 60) || (await el.getAttribute('aria-label')) || '';
            const tagName = await el.evaluate(el => el.tagName.toLowerCase());
            const href = await el.getAttribute('href');
            const id = await el.getAttribute('id');
            const className = await el.getAttribute('class');
            // Create a simple selector
            let selector = tagName;
            if (id) {
                selector = `#${id}`;
            }
            else if (className) {
                const firstClass = className.split(' ')[0];
                selector = `${tagName}.${firstClass}`;
            }
            else {
                selector = `${tagName}:nth-of-type(${i + 1})`;
            }
            console.log(`Action ${i + 1}: "${text}" -> ${selector} (href: ${href})`);
            actions.push({ selector, name: text, href });
        }
        catch (e) {
            console.log(`Error processing element ${i + 1}: ${e}`);
        }
    }
    return actions;
}
