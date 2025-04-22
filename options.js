let messages = null;

async function loadMessages(lang) {
  try {
    const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    return await res.json();
  } catch (error) {
    console.error('加载语言包失败:', error);
    return null;
  }
}

function applyTranslations(messages) {
  if (!messages) return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    // 确保这里是 innerHTML
    el.innerHTML = messages[el.dataset.i18n]?.message || '';
  });
}

async function savePosition(position) {
  try {
    await chrome.storage.sync.set({ position });
    const currentMessages = await loadMessages(document.getElementById('lang').value);
    showStatus(currentMessages?.statusSaved?.message || 'Options saved');
    return true;
  } catch (error) {
    console.error('保存失败:', error);
    showStatus('Save failed');
    return false;
  }
}

async function init() {
  try {
    // 初始化语言
    const { language = 'en' } = await chrome.storage.sync.get({ language: 'en' });
    const langSelect = document.getElementById('lang');
    langSelect.value = language;
    
    // 加载并应用翻译
    messages = await loadMessages(language);
    applyTranslations(messages);

    // 初始化选项
    const { position } = await chrome.storage.sync.get({ position: 'right' });
    const radio = document.querySelector(`input[name="position"][value="${position}"]`);
    if (radio) {
      radio.checked = true;
    } else {
      document.querySelector('input[value="right"]').checked = true;
      await savePosition('right');
    }

    // 事件监听
    document.getElementById('options').addEventListener('change', async (e) => {
      if (e.target.type === 'radio') {
        await savePosition(e.target.value);
      }
    });

    langSelect.addEventListener('change', async () => {
      const lang = langSelect.value;
      await chrome.storage.sync.set({ language: lang });
      messages = await loadMessages(lang);
      applyTranslations(messages);
      showStatus(messages?.languageChanged?.message || 'Language changed');
    });
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

function showStatus(text) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = text;
  status.classList.add('showing');
  setTimeout(() => status.classList.remove('showing'), 1500);
}

// 确保DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 查找类似这样的代码
document.getElementById('option-right-label').textContent = chrome.i18n.getMessage('optionRight');
// 修改为
document.getElementById('option-right-label').innerHTML = chrome.i18n.getMessage('optionRight');

// 对所有选项标签进行类似修改
document.getElementById('option-left-label').innerHTML = chrome.i18n.getMessage('optionLeft');
document.getElementById('option-start-label').innerHTML = chrome.i18n.getMessage('optionStart');
document.getElementById('option-end-label').innerHTML = chrome.i18n.getMessage('optionEnd');