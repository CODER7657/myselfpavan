// Enhanced Notification Service
class NotificationService {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 3;
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.addStyles();
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                background: rgba(0, 0, 0, 0.95);
                border-radius: 10px;
                padding: 15px 20px;
                font-family: 'Fira Code', monospace;
                font-size: 14px;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
                backdrop-filter: blur(10px);
                transform: translateX(100%);
                transition: all 0.3s ease;
                border-left: 4px solid;
                position: relative;
                overflow: hidden;
            }

            .notification.show {
                transform: translateX(0);
            }

            .notification--success {
                color: #00ff41;
                border-color: #00ff41;
                border: 1px solid rgba(0, 255, 65, 0.5);
            }

            .notification--error {
                color: #ff6b6b;
                border-color: #ff6b6b;
                border: 1px solid rgba(255, 107, 107, 0.5);
            }

            .notification--info {
                color: #00ffff;
                border-color: #00ffff;
                border: 1px solid rgba(0, 255, 255, 0.5);
            }

            .notification--warning {
                color: #ffaa00;
                border-color: #ffaa00;
                border: 1px solid rgba(255, 170, 0, 0.5);
            }

            .notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }

            .notification-icon {
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .notification-text {
                flex: 1;
                line-height: 1.4;
            }

            .notification-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                margin-left: 10px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
                flex-shrink: 0;
            }

            .notification-close:hover {
                opacity: 1;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: currentColor;
                opacity: 0.3;
                transition: width linear;
            }

            .notification-actions {
                margin-top: 10px;
                display: flex;
                gap: 10px;
            }

            .notification-action {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid currentColor;
                color: inherit;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'Fira Code', monospace;
            }

            .notification-action:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            @media (max-width: 480px) {
                #notification-container {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
                
                .notification {
                    font-size: 13px;
                    padding: 12px 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.addNotification(notification);
        return notification.id;
    }

    createNotification(message, type, options) {
        const id = 'notification-' + Date.now() + Math.random().toString(36).substr(2, 9);
        const duration = options.duration || this.defaultDuration;
        const persistent = options.persistent || false;
        const actions = options.actions || [];

        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification notification--${type}`;

        const icon = this.getIcon(type);
        const actionsHtml = actions.length > 0 ? 
            `<div class="notification-actions">
                ${actions.map(action => 
                    `<button class="notification-action" data-action="${action.id}">${action.label}</button>`
                ).join('')}
            </div>` : '';

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <div class="notification-text">
                    ${message.replace(/\n/g, '<br>')}
                    ${actionsHtml}
                </div>
                <button class="notification-close" aria-label="Close notification">×</button>
            </div>
            ${!persistent ? '<div class="notification-progress"></div>' : ''}
        `;

        // Bind events
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(id));

        // Bind action events
        actions.forEach(action => {
            const actionBtn = notification.querySelector(`[data-action="${action.id}"]`);
            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    action.callback();
                    if (action.closeOnClick !== false) {
                        this.remove(id);
                    }
                });
            }
        });

        // Auto-remove if not persistent
        if (!persistent && duration > 0) {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.transitionDuration = duration + 'ms';
                
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 100);
            }

            setTimeout(() => this.remove(id), duration);
        }

        return { element: notification, id, type, message };
    }

    addNotification(notification) {
        const container = document.getElementById('notification-container');
        
        // Remove oldest notification if at max capacity
        if (this.notifications.length >= this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.remove(oldest.id);
        }

        container.appendChild(notification.element);
        this.notifications.push(notification);

        // Trigger show animation
        setTimeout(() => {
            notification.element.classList.add('show');
        }, 100);
    }

    remove(id) {
        const notification = document.getElementById(id);
        if (!notification) return;

        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }

    removeAll() {
        this.notifications.forEach(notification => {
            this.remove(notification.id);
        });
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { duration: 8000, ...options });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Show email-specific notifications
    emailSent(recipientEmail, senderName) {
        return this.success(
            `Email sent successfully!\n\nThank you, ${senderName}!\nI'll respond to ${recipientEmail} soon.`,
            { duration: 7000 }
        );
    }

    emailFailed(error) {
        return this.error(
            `Failed to send email:\n${error}\n\nPlease try again or contact me directly at pavanpatela5598@gmail.com`,
            { 
                duration: 10000,
                actions: [
                    {
                        id: 'retry',
                        label: 'Retry',
                        callback: () => {
                            // Trigger form resubmission
                            const event = new CustomEvent('retryEmailSend');
                            document.dispatchEvent(event);
                        }
                    },
                    {
                        id: 'contact',
                        label: 'Direct Contact',
                        callback: () => {
                            window.open('mailto:pavanpatela5598@gmail.com', '_blank');
                        },
                        closeOnClick: false
                    }
                ]
            }
        );
    }
}

// Export for use in other modules
window.NotificationService = NotificationService;