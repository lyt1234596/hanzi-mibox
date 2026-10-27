/**
 * 脑筋急转弯AI机器人 - 前端交互逻辑
 */

// ==================== 全局状态 ====================
const state = {
    currentSession: null,
    messages: [],
    isLoading: false
};

// API 基础URL
const API_BASE_URL = '/api';

// ==================== DOM 元素 ====================
const elements = {
    sessionList: document.querySelector('#sessionList'),
    chatMessages: document.querySelector('#chatMessages'),
    chatInput: document.querySelector('#chatInput'),
    sendBtn: document.querySelector('#sendBtn'),
    newSessionBtn: document.querySelector('#newSessionBtn'),
    sessionName: document.querySelector('#sessionName'),
    nickName: document.querySelector('#nickName'),
    nature: document.querySelector('#nature'),
    difficulty: document.querySelector('#difficulty'),
    themeBtn: document.querySelector('#themeBtn'),
    themeDropdown: document.querySelector('#themeDropdown')
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    await init();
});

async function init() {
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载会话列表
    await loadSessionList();
    
    // 如果没有当前会话，创建一个新会话
    if (!state.currentSession) {
        await createNewSession();
    }
}

function bindEventListeners() {
    // 发送消息
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 新建会话（服务端已自动保存聊天记录，无需再调用保存接口）
    elements.newSessionBtn.addEventListener('click', async () => {
        await createNewSession();
    });
    
    // 主题切换
    bindThemeSwitcher();
}

// ==================== 主题切换功能 ====================

function bindThemeSwitcher() {
    // 点击主题按钮显示/隐藏下拉菜单
    elements.themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.themeDropdown.classList.toggle('show');
    });
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', () => {
        elements.themeDropdown.classList.remove('show');
    });
    
    // 点击下拉菜单内部不关闭
    elements.themeDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 主题选项点击事件
    const themeOptions = elements.themeDropdown.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            applyTheme(theme);
            elements.themeDropdown.classList.remove('show');
        });
    });
    
    // 加载保存的主题
    loadSavedTheme();
}

function applyTheme(theme) {
    // 移除所有主题类
    document.body.classList.remove('theme-dark');
    
    // 应用新主题
    if (theme === 'dark') {
        document.body.classList.add('theme-dark');
    }
    // light 主题不需要添加类，使用默认样式
    
    // 保存主题到本地存储
    localStorage.setItem('brain-teaser-theme', theme);
    
    // 更新选中状态（使用requestAnimationFrame确保DOM更新完成）
    requestAnimationFrame(() => {
        updateThemeSelection(theme);
    });
}

function updateThemeSelection(theme) {
    // 移除所有选中状态
    const themeOptions = elements.themeDropdown.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.classList.remove('active');
    });
    
    // 为当前主题添加选中状态
    const activeOption = elements.themeDropdown.querySelector(`[data-theme="${theme}"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('brain-teaser-theme') || 'light';
    // 直接应用主题并更新选中状态
    applyTheme(savedTheme);
}

// ==================== 会话管理 ====================

async function loadSessionList() {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions`);
        const result = await response.json();
        
        if (result.code === 200) {
            const sessions = result.data;
            renderSessionList(sessions);
            
            // 如果有会话，加载最新的一个
            if (sessions.length > 0 && !state.currentSession) {
                await loadSession(sessions[0]);
            }
        } else {
            showError(result.message || '加载会话列表失败');
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
        showError('加载会话列表失败');
    }
}

/**
 * 从后端返回的会话数据里安全取出「会话名字符串」
 * 后端可能返回 "2026-10-26_18-22-59"，也可能返回 {huihua_name: "..."} 整对象。
 * 直接把对象塞进模板字符串 -> 会显示成丑陋的 [object Object]
 */
function sessionNameOf(session) {
    if (!session) return '';
    if (typeof session === 'string') return session;
    if (typeof session === 'object') {
        return session.huihua_name || session.name || session.session_id || '';
    }
    return String(session);
}

function renderSessionList(sessions) {
    elements.sessionList.innerHTML = '';
    
    sessions.forEach(session => {
        // 统一转成字符串，避免对象被模板字符串转成 [object Object]
        const sessionName = sessionNameOf(session);
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item';
        
        const isActive = sessionName === state.currentSession;
        
        sessionItem.innerHTML = `
            <button class="session-btn ${isActive ? 'btn-active' : 'btn-secondary'}" 
                    data-session="${sessionName}">
                ${sessionName}
            </button>
            <button class="btn btn-icon" data-delete="${sessionName}" title="删除会话">❌️</button>
        `;
        
        // 加载会话事件
        const loadBtn = sessionItem.querySelector(`[data-session="${sessionName}"]`);
        loadBtn.addEventListener('click', () => loadSession(sessionName));
        
        // 删除会话事件
        const deleteBtn = sessionItem.querySelector(`[data-delete="${sessionName}"]`);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(sessionName);
        });
        
        elements.sessionList.appendChild(sessionItem);
    });
}

async function loadSession(session) {
    // 入参可能是对象，先统一成字符串会话名
    const sessionName = sessionNameOf(session);
    // 记录切换前的状态，加载失败时回滚，避免当前会话指向一个打不开的文件
    const prevSession = state.currentSession;
    const prevMessages = state.messages;
    try {
        state.currentSession = sessionName;
        const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionName)}`);
        if (!response.ok) {
            throw new Error('会话不存在');
        }
        
        const result = await response.json();
        
        if (result.code === 200) {
            const sessionData = result.data;
            
            // 更新状态
            state.messages = sessionData.huihuaxinxi || sessionData.messages || [];
            elements.sessionName.textContent = `会话名称: ${sessionName}`;
            
            // 渲染消息
            renderMessages();
            
            // 刷新会话列表以更新激活状态
            await loadSessionList();
        } else {
            // 后端明确说这个会话不存在（文件已被删掉）
            state.currentSession = prevSession;
            state.messages = prevMessages;
            showError(`会话「${sessionName}」的记录文件不存在了`);
            await loadSessionList();
        }
    } catch (error) {
        console.error('加载会话失败:', error);
        state.currentSession = prevSession;
        state.messages = prevMessages;
        showError('加载会话失败');
    }
}

async function createNewSession() {
    // 注意：这里绝对不能因为「前端 state.messages 为空」就删掉当前会话的文件。
    // state.messages 为空有两种可能：1) 真的是空会话 2) 加载失败/还没加载。
    // 后者会把有内容的历史记录误删，所以只新建、不删除任何文件。

    try {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        // 更新状态
        if (result.code === 200 && result.data){
            // 注意：后端 data 是整个会话对象，必须取 .huihua_name，不能直接用 result.data
            state.currentSession = sessionNameOf(result.data);
            state.messages = [];

            // 更新UI
            elements.sessionName.textContent = `会话名称: ${state.currentSession}`;
            renderMessages();

            // 刷新会话列表
            await loadSessionList();
        } else {
            showError(result.message || '创建会话失败');
        }
    } catch (error) {
        console.error('创建会话失败:', error);
        showError('创建会话失败');
    }
}

async function deleteSession(sessionId) {
    if (!confirm(`确定要删除游戏记录 "${sessionId}" 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.code !== 200) {
            throw new Error(result.message || '删除失败');
        }
        
        // 如果删除的是当前会话，重置状态
        if (sessionId === state.currentSession) {
            state.currentSession = null;
            state.messages = [];
            elements.sessionName.textContent = '会话名称: ';
            renderMessages();
        }
        
        // 刷新会话列表
        await loadSessionList();
        
        // 如果没有会话了，创建新会话
        const sessionsResponse = await fetch(`${API_BASE_URL}/sessions`);
        const sessionsResult = await sessionsResponse.json();
        const sessions = sessionsResult.data || [];
        if (sessions.length === 0) {
            await createNewSession();
        }
        
    } catch (error) {
        console.error('删除会话失败:', error);
        showError('删除会话失败');
    }
}

// ==================== 消息管理 ====================

function renderMessages() {
    elements.chatMessages.innerHTML = '';
    
    if (state.messages.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🪄</div>
                <div class="empty-state-text">开始汉字谜盒挑战吧~</div>
            </div>
        `;
        return;
    }
    
    state.messages.forEach(msg => {
        appendMessageToUI(msg.role, msg.content);
    });
    
    scrollToBottom();
}

function appendMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = role === 'user' ? '🤓' : '🪄';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;
    
    // 如果是空状态，先清空
    const emptyState = elements.chatMessages.querySelector('.empty-state');
    if (emptyState) {
        elements.chatMessages.innerHTML = '';
    }
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading-message';
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.innerHTML = `
        <div class="message-avatar">🪄</div>
        <div class="message-content">
            <div class="loading">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        </div>
    `;
    elements.chatMessages.appendChild(loadingDiv);
    scrollToBottom();
}

function hideLoading() {
    const loadingIndicator = document.querySelector('#loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ==================== 聊天功能 ====================

async function sendMessage() {
    const message = elements.chatInput.value.trim();
    
    if (!message || state.isLoading) {
        return;
    }
    
    // 清空输入框
    elements.chatInput.value = '';
    
    // 添加用户消息到UI
    appendMessageToUI('user', message);
    
    // 保存到状态
    state.messages.push({ role: 'user', content: message });
    
    // 显示加载状态
    state.isLoading = true;
    showLoading();
    
    try {
        // 调用API（服务端会根据session_id自动加载聊天记录）
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: state.currentSession,
                message: message
            })
        });
        
        if (!response.ok) {
            throw new Error('AI响应失败');
        }
        
        const result = await response.json();
        
        // 隐藏加载状态
        hideLoading();
        
        if (result.code === 200) {
            // 添加AI回复到UI
            appendMessageToUI('assistant', result.data);
            
            // 更新本地状态
            state.messages.push({ role: 'assistant', content: result.data });
        } else {
            throw new Error(result.message || 'AI响应失败');
        }
        
    } catch (error) {
        console.error('发送消息失败:', error);
        hideLoading();
        showError('发送消息失败，请重试');
        
        // 移除失败的用户消息
        state.messages.pop();
        renderMessages();
    } finally {
        state.isLoading = false;
    }
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert(message);
}