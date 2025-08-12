// Global variables
let matrixCanvas, matrixCtx;
let isBootComplete = false;
let typingIndex = 0;
let currentCommand = '';
let commandHistory = [];
let historyIndex = -1;

// Matrix Rain Effect
function initMatrixRain() {
    matrixCanvas = document.getElementById('matrix-rain');
    matrixCtx = matrixCanvas.getContext('2d');
    
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    
    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const matrixArray = matrix.split("");
    
    const fontSize = 10;
    const columns = matrixCanvas.width / fontSize;
    
    const drops = [];
    for(let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
    
    function drawMatrix() {
        matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        
        matrixCtx.fillStyle = '#00ff41';
        matrixCtx.font = fontSize + 'px Fira Code';
        
        for(let i = 0; i < drops.length; i++) {
            const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
            matrixCtx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if(drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(drawMatrix, 35);
}

// Boot Sequence
function startBootSequence() {
    const loadingText = document.getElementById('loading-text');
    const bootSequence = document.getElementById('boot-sequence');
    
    const loadingStages = [
        "INITIALIZING SYSTEM...",
        "LOADING CYBERSECURITY MODULES...",
        "ESTABLISHING BLOCKCHAIN CONNECTION...",
        "QUANTUM ENCRYPTION READY...",
        "SYSTEM LOADED SUCCESSFULLY"
    ];
    
    let stageIndex = 0;
    
    const updateLoadingText = setInterval(() => {
        if (stageIndex < loadingStages.length) {
            loadingText.textContent = loadingStages[stageIndex];
            stageIndex++;
        } else {
            clearInterval(updateLoadingText);
            setTimeout(() => {
                bootSequence.classList.add('hidden');
                document.querySelector('.terminal-nav').classList.remove('hidden');
                isBootComplete = true;
                startTypingAnimation();
                initSkillBars();
            }, 500);
        }
    }, 600);
}

// Typing Animation
function startTypingAnimation() {
    const typedText = document.getElementById('typed-text');
    const commands = [
        "whoami",
        "cat about.txt",
        "ls projects/",
        "python3 secure_blockchain.py"
    ];
    
    let commandIndex = 0;
    let charIndex = 0;
    
    function type() {
        if (commandIndex < commands.length) {
            if (charIndex < commands[commandIndex].length) {
                typedText.textContent += commands[commandIndex].charAt(charIndex);
                charIndex++;
                setTimeout(type, 100);
            } else {
                setTimeout(() => {
                    typedText.textContent = '';
                    charIndex = 0;
                    commandIndex++;
                    setTimeout(type, 500);
                }, 2000);
            }
        } else {
            commandIndex = 0;
            setTimeout(type, 1000);
        }
    }
    
    type();
}

// Navigation functionality
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                // Calculate offset for fixed navigation
                const navHeight = document.querySelector('.terminal-nav').offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
            
            // Close mobile menu if open
            if (navMenu) {
                navMenu.classList.remove('active');
            }
            if (navToggle) {
                navToggle.classList.remove('active');
            }
        });
    });
}

// Skill Bar Animations
function initSkillBars() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const skillProgress = entry.target.querySelectorAll('.skill-progress');
                skillProgress.forEach((bar, index) => {
                    const width = bar.getAttribute('data-width');
                    setTimeout(() => {
                        bar.style.width = width + '%';
                    }, 200 + (index * 100));
                });
            }
        });
    }, { threshold: 0.5 });
    
    const skillSections = document.querySelectorAll('.skill-category');
    skillSections.forEach(section => {
        observer.observe(section);
    });
}

// Interactive Terminal
function initInteractiveTerminal() {
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');
    
    if (!terminalInput || !terminalOutput) return;
    
    const fileSystem = {
        'resume.txt': `
PAVAN PATEL
Cybersecurity & Blockchain Developer
========================================
Education:
- BS Computer Science, BITS PILANI (2024-2027)
- BTech CSE (Data Science), NEW LJIET (2024-2028)

Experience: 3+ Years
Location: Available Globally
Specialization: Quantum-Resistant Cryptography

Skills:
- Penetration Testing (75%)
- Smart Contracts (78%)
- Python Programming (75%)
- Network Security (70%)
- Blockchain Development (68%)

Contact: pavanpatela5598@gmail.com
GitHub: github.com/CODER7657
LinkedIn: linkedin.com/in/pavan-patel-559195261
        `,
        'projects.txt': `
ACTIVE PROJECTS
===============
1. QuantumChatCryptography - Post-quantum messaging app
2. VortiFiBlockchain - Decentralized application
3. VeriServeVerification - Certificate verification system  
4. CyberToolkitSecurity - Penetration testing toolkit
        `,
        'skills.json': `
{
  "cybersecurity": {
    "penetration_testing": 75,
    "network_security": 70,
    "cryptography": 65,
    "vulnerability_assessment": 68
  },
  "blockchain": {
    "smart_contracts": 78,
    "solidity": 70,
    "web3js": 65,
    "defi_protocols": 60
  },
  "programming": {
    "python": 75,
    "javascript": 70,
    "nodejs": 68,
    "react": 65
  }
}
        `
    };
    
    const commands = {
        help: () => {
            return `
Available commands:
==================
help         - Show this help message
whoami       - Display current user information
ls           - List files and directories
cat [file]   - Display file contents
pwd          - Show current directory
date         - Show current date and time
clear        - Clear terminal screen
sudo [cmd]   - Attempt to run command as superuser
hack [target]- Attempt to hack target (educational purposes)
neofetch     - Display system information
            `;
        },
        
        whoami: () => {
            return `
pavan@cybersec
Role: Cybersecurity & Blockchain Developer
Status: Online and ready for new challenges
Security Level: Maximum
            `;
        },
        
        ls: () => {
            return `
total 4
drwxr-xr-x 2 pavan cybersec 4096 Aug 10 16:00 projects/
-rw-r--r-- 1 pavan cybersec  512 Aug 10 16:00 resume.txt
-rw-r--r-- 1 pavan cybersec  256 Aug 10 16:00 projects.txt
-rw-r--r-- 1 pavan cybersec  384 Aug 10 16:00 skills.json
-rwxr-xr-x 1 pavan cybersec 1024 Aug 10 16:00 secure_blockchain.py*
-rwxr-xr-x 1 pavan cybersec  768 Aug 10 16:00 penetration_test.py*
            `;
        },
        
        pwd: () => {
            return `/home/pavan/cybersec_workspace`;
        },
        
        date: () => {
            return new Date().toString();
        },
        
        clear: () => {
            terminalOutput.innerHTML = `
                <div class="terminal-line">
                    <span class="output-text">Welcome to Pavan's Interactive Terminal!</span>
                </div>
                <div class="terminal-line">
                    <span class="output-text">Type 'help' to see available commands.</span>
                </div>
            `;
            return '';
        },
        
        neofetch: () => {
            return `
                    .-.
                   /   \\        pavan@cybersec
                  |  o  |       ----------------
                   \\   /        OS: CyberSecOS 3.0
                    '-'         Host: Quantum-Resistant Terminal
     ___________________________
    < Welcome to Pavan's System! >      Kernel: Linux 5.19.0-cyber
     ---------------------------       Uptime: 3 years, 2 months
                                       Packages: 1337 (apt)
    Shell: /bin/bash                   Shell: zsh 5.8.1
    Resolution: 1920x1080              Terminal: gnome-terminal
    CPU: Intel i9-12900K               CPU: Intel i9-12900K (16) @ 3.20GHz
    Memory: 32GB DDR5                  GPU: RTX 4090
                                       Memory: 28GB / 32GB
            `;
        },
        
        sudo: (args) => {
            const responses = [
                "Nice try! You have no power here 😈",
                "sudo: permission denied. This isn't your system!",
                "Error: Unauthorized access attempt detected!",
                "sudo: You're not in the sudoers file. This incident will be reported.",
                "Access denied. Initiating security protocol..."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        },
        
        hack: (args) => {
            const target = args.join(' ') || 'unknown';
            const responses = [
                `Attempting to hack ${target}... ACCESS DENIED! ❌`,
                `Hacking ${target}... Firewall detected! Connection terminated.`,
                `ERROR: ${target} has quantum encryption enabled. Hack failed!`,
                `Initiating penetration test on ${target}... Just kidding! That would be illegal 😄`,
                `${target} is protected by military-grade security. Nice try though!`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        },
        
        cat: (args) => {
            const filename = args[0];
            if (filename && fileSystem[filename]) {
                return fileSystem[filename];
            } else if (filename) {
                return `cat: ${filename}: No such file or directory`;
            } else {
                return `cat: missing file operand\nTry 'cat --help' for more information.`;
            }
        }
    };
    
    function addToOutput(text, className = 'output-text') {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        const span = document.createElement('span');
        span.className = className;
        span.innerHTML = text.replace(/\n/g, '<br>');
        line.appendChild(span);
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
    
    function processCommand(input) {
        const args = input.trim().split(' ');
        const command = args[0].toLowerCase();
        const commandArgs = args.slice(1);
        
        // Add command to history
        if (input.trim() && commandHistory[commandHistory.length - 1] !== input.trim()) {
            commandHistory.push(input.trim());
        }
        historyIndex = commandHistory.length;
        
        // Display the command
        addToOutput(`<span class="prompt">root@pavanpatel:~$</span> ${input}`, 'info-text');
        
        if (commands[command]) {
            const result = commands[command](commandArgs);
            if (result) {
                addToOutput(result);
            }
        } else if (input.trim() === '') {
            // Do nothing for empty input
        } else {
            addToOutput(`Command not found: ${command}\nType 'help' for available commands.`, 'error-text');
        }
    }
    
    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            processCommand(terminalInput.value);
            terminalInput.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                terminalInput.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                terminalInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                terminalInput.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const input = terminalInput.value.toLowerCase();
            const availableCommands = Object.keys(commands);
            const matches = availableCommands.filter(cmd => cmd.startsWith(input));
            if (matches.length === 1) {
                terminalInput.value = matches[0];
            }
        }
    });
    
    // Focus terminal input when clicking anywhere in the terminal
    const terminalWorkspace = document.querySelector('.terminal-workspace');
    if (terminalWorkspace) {
        terminalWorkspace.addEventListener('click', () => {
            terminalInput.focus();
        });
    }
}

// Enhanced Contact Form with Real Email Functionality
function initContactForm() {
    // Initialize services
    const emailService = new EmailService();
    const notificationService = new NotificationService();
    
    // Initialize contact form with services
    const contactForm = new ContactForm('#contact-form', emailService, notificationService);
    
    // Listen for retry events
    document.addEventListener('retryEmailSend', () => {
        const form = document.getElementById('contact-form');
        if (form) {
            // Re-trigger form submission
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
        }
    });
    
    // Add email service status monitoring
    setInterval(() => {
        if (contactForm && contactForm.updateEmailStatus) {
            contactForm.updateEmailStatus();
        }
    }, 5000);
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="notification-text">${message.replace(/\n/g, '<br>')}</span>
            <button class="notification-close">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: ${type === 'success' ? '#00ff41' : type === 'error' ? '#ff6b6b' : '#00ffff'};
        border: 1px solid ${type === 'success' ? '#00ff41' : type === 'error' ? '#ff6b6b' : '#00ffff'};
        border-radius: 10px;
        padding: 15px 20px;
        max-width: 400px;
        z-index: 10000;
        font-family: 'Fira Code', monospace;
        font-size: 14px;
        box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        backdrop-filter: blur(10px);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 10px;
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
        margin-left: auto;
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close functionality
    const closeNotification = () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeNotification);
    
    // Auto close after 5 seconds
    setTimeout(closeNotification, 5000);
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    // Already handled in navigation function
}

// Project card hover effects
function initProjectCards() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
            card.style.boxShadow = '0 0 40px rgba(0, 255, 65, 0.4)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.1)';
        });
    });
}

// Window resize handler
function handleWindowResize() {
    window.addEventListener('resize', () => {
        if (matrixCanvas) {
            matrixCanvas.width = window.innerWidth;
            matrixCanvas.height = window.innerHeight;
        }
    });
}

// Intersection Observer for animations
function initAnimationObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe sections for scroll animations
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load email service components first
    loadEmailComponents().then(() => {
        // Initialize matrix rain background
        initMatrixRain();
        
        // Start boot sequence
        setTimeout(startBootSequence, 1000);
        
        // Initialize navigation
        initNavigation();
        
        // Initialize interactive terminal
        initInteractiveTerminal();
        
        // Initialize enhanced contact form with email functionality
        initContactForm();
        
        // Initialize smooth scrolling
        initSmoothScrolling();
        
        // Initialize project cards
        initProjectCards();
        
        // Initialize animation observer
        initAnimationObserver();
        
        // Handle window resize
        handleWindowResize();
        
        // Focus terminal input when page loads
        setTimeout(() => {
            const terminalInput = document.getElementById('terminal-input');
            if (terminalInput) {
                terminalInput.focus();
            }
        }, 5000);
    });
});

// Load email service components
async function loadEmailComponents() {
    const components = [
        'src/components/NotificationService.js',
        'src/components/EmailService.js',
        'src/components/ContactForm.js'
    ];
    
    for (const component of components) {
        try {
            await loadScript(component);
        } catch (error) {
            console.error(`Failed to load ${component}:`, error);
        }
    }
}

// Helper function to load scripts dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Alt + T to focus terminal
    if (e.altKey && e.key === 't') {
        e.preventDefault();
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.focus();
            document.getElementById('terminal').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
    
    // Ctrl + / to show help in terminal
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.value = 'help';
            terminalInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }
    }
});

// Easter eggs and fun interactions
function initEasterEggs() {
    let konamiCode = [];
    const konamiSequence = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    
    document.addEventListener('keydown', (e) => {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
            showNotification('🎉 Konami Code activated! You found the secret! 🎉\n\nYou have unlocked: Ultimate Cyber Skills!', 'success');
            konamiCode = [];
        }
    });
}

// Initialize easter eggs
setTimeout(initEasterEggs, 2000);