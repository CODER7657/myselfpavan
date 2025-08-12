// Email Service using EmailJS
class EmailService {
    constructor() {
        this.serviceId = 'service_dehctnv';
        this.templateId = 'template_23t4bfp';
        this.publicKey = 'gX_oED-6rRZnJJSeX'; // Replace with actual key
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Load EmailJS library dynamically
            if (!window.emailjs) {
                await this.loadEmailJS();
            }
            
            // Initialize EmailJS
            emailjs.init(this.publicKey);
            this.isInitialized = true;
            console.log('EmailJS initialized successfully');
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
        }
    }

    loadEmailJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async sendEmail(formData) {
        if (!this.isInitialized) {
            throw new Error('EmailJS not initialized');
        }

        try {
            const templateParams = {
                from_name: formData.name || '(No Name Provided)',
                from_email: formData.email || '(No Email Provided)',
                subject: formData.subject || '(No Subject)',
                message: `Sender Name: ${formData.name || '(No Name Provided)'}\nSender Email: ${formData.email || '(No Email Provided)'}\nSubject: ${formData.subject || '(No Subject)'}\nMessage: ${formData.message || '(No Message)'}\n`,
                to_email: 'pavanpatela5598@gmail.com',
                reply_to: formData.email || '',
                timestamp: new Date().toLocaleString()
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            return {
                success: true,
                messageId: response.text,
                message: 'Email sent successfully!'
            };
        } catch (error) {
            console.error('Email sending failed:', error);
            return {
                success: false,
                error: error.text || error.message || 'Failed to send email',
                message: 'Failed to send email. Please try again.'
            };
        }
    }

    // Validate email format
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate form data
    validateFormData(formData) {
        const errors = [];

        if (!formData.name || formData.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (!formData.email || !this.validateEmail(formData.email)) {
            errors.push('Please enter a valid email address');
        }

        if (!formData.subject || formData.subject.trim().length < 3) {
            errors.push('Subject must be at least 3 characters long');
        }

        if (!formData.message || formData.message.trim().length < 10) {
            errors.push('Message must be at least 10 characters long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Get email status
    getEmailStatus() {
        return {
            isInitialized: this.isInitialized,
            serviceId: this.serviceId,
            templateId: this.templateId
        };
    }
}

// Export for use in other modules
window.EmailService = EmailService;