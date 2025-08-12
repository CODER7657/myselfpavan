// Enhanced Contact Form Component
class ContactForm {
    constructor(formSelector, emailService, notificationService) {
        this.form = document.querySelector(formSelector);
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.isSubmitting = false;
        
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
        this.addEmailStatusIndicator();
    }

    bindEvents() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // Real-time validation
        const inputs = this.form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearFieldError.bind(this));
        });
    }

    setupFormValidation() {
        // Add validation styling
        const style = document.createElement('style');
        style.textContent = `
            .form-field-error {
                border-color: #ff6b6b !important;
                box-shadow: 0 0 10px rgba(255, 107, 107, 0.3) !important;
            }
            
            .form-error-message {
                color: #ff6b6b;
                font-size: 0.8rem;
                margin-top: 5px;
                display: block;
                font-family: 'Fira Code', monospace;
            }
            
            .email-status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-top: 10px;
                font-size: 0.8rem;
                color: #00ffff;
            }
            
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #00ff41;
                animation: pulse 2s infinite;
            }
            
            .status-dot.error {
                background: #ff6b6b;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .form-success-message {
                background: rgba(0, 255, 65, 0.1);
                border: 1px solid rgba(0, 255, 65, 0.3);
                color: #00ff41;
                padding: 15px;
                border-radius: 5px;
                margin-top: 15px;
                font-family: 'Fira Code', monospace;
                font-size: 0.9rem;
            }
        `;
        document.head.appendChild(style);
    }

    addEmailStatusIndicator() {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'email-status-indicator';
        statusDiv.innerHTML = `
            <span class="status-dot"></span>
            <span class="status-text">Email service ready</span>
        `;
        
        const submitButton = this.form.querySelector('button[type="submit"]');
        submitButton.parentNode.insertBefore(statusDiv, submitButton);
        
        // Update status based on email service
        this.updateEmailStatus();
    }

    updateEmailStatus() {
        const statusIndicator = this.form.querySelector('.email-status-indicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        const emailStatus = this.emailService.getEmailStatus();
        
        if (emailStatus.isInitialized) {
            statusDot.classList.remove('error');
            statusText.textContent = 'Email service ready';
        } else {
            statusDot.classList.add('error');
            statusText.textContent = 'Email service initializing...';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        const formData = this.getFormData();
        const validation = this.emailService.validateFormData(formData);
        
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        this.setSubmittingState(true);
        
        try {
            const result = await this.emailService.sendEmail(formData);
            
            if (result.success) {
                this.handleSuccess(formData, result);
            } else {
                this.handleError(result.error || 'Failed to send email');
            }
        } catch (error) {
            this.handleError(error.message || 'Network error occurred');
        } finally {
            this.setSubmittingState(false);
        }
    }

    getFormData() {
        return {
            name: this.form.querySelector('#name').value.trim(),
            email: this.form.querySelector('#email').value.trim(),
            subject: this.form.querySelector('#subject').value.trim(),
            message: this.form.querySelector('#message').value.trim()
        };
    }

    validateField(e) {
        const field = e.target;
        const value = field.value.trim();
        const fieldName = field.name || field.id;
        
        this.clearFieldError(e);
        
        let error = null;
        
        switch (fieldName) {
            case 'name':
                if (value.length < 2) error = 'Name must be at least 2 characters';
                break;
            case 'email':
                if (!this.emailService.validateEmail(value)) error = 'Invalid email format';
                break;
            case 'subject':
                if (value.length < 3) error = 'Subject must be at least 3 characters';
                break;
            case 'message':
                if (value.length < 10) error = 'Message must be at least 10 characters';
                break;
        }
        
        if (error) {
            this.showFieldError(field, error);
        }
    }

    clearFieldError(e) {
        const field = e.target;
        field.classList.remove('form-field-error');
        
        const errorMsg = field.parentNode.querySelector('.form-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    showFieldError(field, message) {
        field.classList.add('form-field-error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error-message';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }

    showValidationErrors(errors) {
        this.notificationService.show(
            `Validation Error:\n${errors.join('\n')}`,
            'error'
        );
    }

    handleSuccess(formData, result) {
        // Reset form
        this.form.reset();
        
        // Show success message
        const successMessage = `
            <div class="form-success-message">
                <strong>✅ Message Sent Successfully!</strong><br>
                Thank you, ${formData.name}!<br>
                Your message has been delivered to pavanpatela5598@gmail.com<br>
                I'll get back to you soon at ${formData.email}
            </div>
        `;
        
        const submitButton = this.form.querySelector('button[type="submit"]');
        const existingSuccess = this.form.querySelector('.form-success-message');
        if (existingSuccess) existingSuccess.remove();
        
        submitButton.insertAdjacentHTML('afterend', successMessage);
        
        // Remove success message after 10 seconds
        setTimeout(() => {
            const successDiv = this.form.querySelector('.form-success-message');
            if (successDiv) successDiv.remove();
        }, 10000);
        
        // Show notification
        this.notificationService.show(
            `Email sent successfully!\n\nThank you, ${formData.name}!\nI'll respond to ${formData.email} soon.`,
            'success'
        );
        
        // Log for analytics (optional)
        this.logEmailSent(formData, result);
    }

    handleError(errorMessage) {
        this.notificationService.show(
            `Failed to send email:\n${errorMessage}\n\nPlease try again or contact me directly at pavanpatela5598@gmail.com`,
            'error'
        );
    }

    setSubmittingState(isSubmitting) {
        this.isSubmitting = isSubmitting;
        const submitButton = this.form.querySelector('button[type="submit"]');
        
        if (isSubmitting) {
            submitButton.textContent = 'Sending email...';
            submitButton.disabled = true;
            submitButton.style.opacity = '0.7';
        } else {
            submitButton.textContent = 'Execute send_message()';
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
        }
    }

    logEmailSent(formData, result) {
        // Optional: Log email sending for analytics
        console.log('Email sent:', {
            timestamp: new Date().toISOString(),
            from: formData.email,
            subject: formData.subject,
            messageId: result.messageId
        });
    }
}

// Export for use in other modules
window.ContactForm = ContactForm;