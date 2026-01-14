// services/NotificationService.js
class NotificationService {
  constructor() {
    this.permission = 'default';
    this.isTabFocused = true;
    this.notificationSound = null;
    
    // Initialize
    this.initializePermission();
    this.initializeTabFocus();
    this.initializeSound();
  }

  // Request notification permission
  async initializePermission() {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', this.permission);
    } else {
      console.warn('⚠️ Browser does not support notifications');
    }
  }

  // Track if user is actively viewing the tab
  initializeTabFocus() {
    document.addEventListener('visibilitychange', () => {
      this.isTabFocused = !document.hidden;
      console.log('👁️ Tab focused:', this.isTabFocused);
    });

    window.addEventListener('focus', () => {
      this.isTabFocused = true;
    });

    window.addEventListener('blur', () => {
      this.isTabFocused = false;
    });
  }

  // Initialize notification sound
  initializeSound() {
    // You can add a notification sound file here
    // this.notificationSound = new Audio('/sounds/notification.mp3');
  }

  // Show browser notification
  showBrowserNotification(title, options = {}) {
    if (this.permission !== 'granted' || this.isTabFocused) {
      return null; // Don't show if no permission or tab is focused
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico', // Your app icon
      badge: '/favicon.ico',
      tag: 'chat-message', // Prevents spam notifications
      requireInteraction: false,
      ...options
    });

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  // Play notification sound
  playNotificationSound() {
    if (this.notificationSound) {
      this.notificationSound.play().catch(e => {
        console.warn('Could not play notification sound:', e);
      });
    }
  }

  // Main method to show chat message notification
  showMessageNotification(message, senderName, conversationName) {
    console.log('🔔 Showing notification for new message');

    // Browser notification (only if tab not focused)
    const notification = this.showBrowserNotification(
      `💬 ${senderName}`,
      {
        body: message.content,
        icon: '/chat-icon.png', // Add a chat icon
        data: {
          conversationId: message.conversation_id,
          messageId: message.id
        }
      }
    );

    // Handle notification click
    if (notification) {
      notification.onclick = () => {
        window.focus();
        // Navigate to conversation (you'll implement this)
        window.dispatchEvent(new CustomEvent('notification-click', {
          detail: { conversationId: message.conversation_id }
        }));
        notification.close();
      };
    }

    // Play sound (always, even if tab is focused)
    this.playNotificationSound();

    return notification;
  }

  // Check if user is active in specific conversation
  isActiveInConversation(conversationId, activeConversationId) {
    return this.isTabFocused && activeConversationId === conversationId;
  }
}

// Create singleton
const notificationService = new NotificationService();
export default notificationService;