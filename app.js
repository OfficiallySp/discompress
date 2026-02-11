/**
 * Discord Tools - Tool switcher
 */
(function () {
    const tabCompress = document.getElementById('tab-compress');
    const tabMarkdown = document.getElementById('tab-markdown');
    const panelCompress = document.getElementById('tool-compress');
    const panelMarkdown = document.getElementById('tool-markdown');

    function showCompress() {
        tabCompress.classList.add('active');
        tabCompress.setAttribute('aria-selected', 'true');
        tabMarkdown.classList.remove('active');
        tabMarkdown.setAttribute('aria-selected', 'false');
        panelCompress.classList.add('active');
        panelCompress.removeAttribute('hidden');
        panelMarkdown.classList.remove('active');
        panelMarkdown.setAttribute('hidden', '');
        history.replaceState(null, '', window.location.pathname);
    }

    function showMarkdown() {
        tabMarkdown.classList.add('active');
        tabMarkdown.setAttribute('aria-selected', 'true');
        tabCompress.classList.remove('active');
        tabCompress.setAttribute('aria-selected', 'false');
        panelMarkdown.classList.add('active');
        panelMarkdown.removeAttribute('hidden');
        panelCompress.classList.remove('active');
        panelCompress.setAttribute('hidden', '');
        history.replaceState(null, '', window.location.pathname + '#markdown');
    }

    tabCompress.addEventListener('click', showCompress);
    tabMarkdown.addEventListener('click', showMarkdown);

    // Hash support: /#markdown opens Markdown tab directly
    if (window.location.hash === '#markdown') {
        showMarkdown();
    }

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#markdown') showMarkdown();
        else showCompress();
    });

    // Keyboard navigation for tabs
    [tabCompress, tabMarkdown].forEach((tab, i) => {
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (i === 0) showCompress();
                else showMarkdown();
            }
        });
    });
})();
