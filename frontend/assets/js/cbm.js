// CBM Assessment JavaScript - Simplified UX

class CBMAssessment {
    constructor(userId, textId) {
        this.userId = userId;
        this.selectedTextId = textId !== null && textId !== undefined ? parseInt(textId) : 0;
        console.log(`CBM Constructor: userId=${userId}, textId=${textId}, selectedTextId=${this.selectedTextId}`);
        this.timeRemaining = 120; // 2 minutes in seconds
        this.timer = null;
        this.answers = {};
        this.currentTextData = null;
        this.autoSaveInterval = null;
        
        // CBM Text Data will be loaded from JSON file 
        this.cbmTexts = {};
        
        this.init();
    }
    
    async init() {
        console.log('CBM Assessment initialized for user:', this.userId, 'text:', this.selectedTextId);
        
        // Load CBM text data from JSON file
        await this.loadCBMData();
        
        // Set current text data
        this.currentTextData = this.cbmTexts[this.selectedTextId];
        
        if (!this.currentTextData) {
            console.error('Text not found:', this.selectedTextId);
            return;
        }
        
        // Start assessment immediately
        this.setupAssessmentContent();
        this.startTimer();
        this.startAutoSave();
        this.setupEventListeners();
    }
    
    async loadCBMData() {
        try {
            // Load only the specific text that's needed
            const textFile = `/assets/data/cbm-text-${this.selectedTextId}.json?v=${Date.now()}`;
            console.log(`Loading CBM text ${this.selectedTextId} from ${textFile}`);
            
            const response = await fetch(textFile);
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`Failed to load CBM text ${this.selectedTextId}: ${response.status} ${response.statusText}`);
            }
            
            const textData = await response.json();
            console.log('CBM text data loaded:', textData);
            
            // Convert to expected format
            this.cbmTexts[textData.id] = {
                id: textData.id,
                title: textData.title,
                type: textData.type,
                cloze_test: this.convertExercisesToClozeTest(textData.exercises)
            };
            
            console.log(`Loaded text ${textData.id}: ${textData.title} with ${textData.exercises.length} exercises`);
            console.log('CBM text loaded successfully');
        } catch (error) {
            console.error('CRITICAL ERROR loading CBM data:', error);
            alert('FOUT: Kan CBM tekst niet laden. Controleer console voor details.');
            return;
        }
    }
    
    convertExercisesToClozeTest(exercises) {
        // Convert the JSON exercise format to the cloze test format
        let fullText = '';
        const choices = [];
        
        exercises.forEach((exercise, index) => {
            const blankId = index + 1;
            
            // Add text before the blank
            fullText += exercise.text_before;
            
            // Add the blank placeholder
            fullText += `[BLANK_${blankId}]`;
            
            // Add text after the blank (for the last exercise)
            if (index === exercises.length - 1) {
                fullText += exercise.text_after;
            }
            
            // Create choice object
            choices.push({
                blank_id: blankId,
                options: exercise.options,
                correct_answer: exercise.correct_answer
            });
        });
        
        return {
            text_with_blanks: fullText,
            choices: choices
        };
    }
    
    loadFallbackData() {
        // Use the correct practice text as fallback
        this.cbmTexts = {
            0: {
                id: 0,
                title: "CBM 0 - Oefentekst: Sneakers meer dan alleen schoenen",
                type: "practice",
                cloze_test: {
                    text_with_blanks: "Sneakers zijn tegenwoordig super populair onder jongeren. Ze zijn niet alleen comfortabel, maar [BLANK_1] een belangrijk onderdeel van je outfit. [BLANK_2] je nu naar school gaat, met vrienden [BLANK_3] of gewoon chillt, sneakers passen altijd.\n\nEr [BLANK_4] veel verschillende soorten sneakers. Denk aan [BLANK_5] zoals Nike, Adidas, Puma en Vans. [BLANK_6] jongeren kiezen voor felle kleuren en [BLANK_7] ontwerpen, terwijl anderen liever simpele, witte [BLANK_8] dragen. Wat je stijl ook is, [BLANK_9] is altijd wel een sneaker die bij je past.",
                    choices: [
                        { blank_id: 1, options: ["veel", "ook", "aan"], correct_answer: "ook" },
                        { blank_id: 2, options: ["Of", "Er", "Die"], correct_answer: "Of" },
                        { blank_id: 3, options: ["terwijl", "stijl", "afspreekt"], correct_answer: "afspreekt" },
                        { blank_id: 4, options: ["wat", "zijn", "alleen"], correct_answer: "zijn" },
                        { blank_id: 5, options: ["kleuren", "merken", "dragen"], correct_answer: "merken" },
                        { blank_id: 6, options: ["Sommige", "Sneakers", "Vrienden"], correct_answer: "Sommige" },
                        { blank_id: 7, options: ["witte", "opvallende", "passen"], correct_answer: "opvallende" },
                        { blank_id: 8, options: ["outfit", "sneakers", "school"], correct_answer: "sneakers" },
                        { blank_id: 9, options: ["er", "of", "nu"], correct_answer: "er" }
                    ]
                }
            }
        };
        console.log('Using fallback CBM data with correct practice text');
    }
    
    setupAssessmentContent() {
        const textData = this.currentTextData;
        
        // Create cloze test HTML with inline options
        let clozeHTML = textData.cloze_test.text_with_blanks;
        
        textData.cloze_test.choices.forEach(choice => {
            const optionsHTML = choice.options.map(option => 
                `<span class="cloze-option" 
                       data-blank-id="${choice.blank_id}" 
                       data-option="${option}"
                       data-correct="${choice.correct_answer}">
                    ${option}
                </span>`
            ).join('');
            
            const containerHTML = `
                <span class="cloze-blank">
                    <span class="cloze-options-container" data-blank-id="${choice.blank_id}">
                        ${optionsHTML}
                    </span>
                </span>`;
            
            clozeHTML = clozeHTML.replace(`[BLANK_${choice.blank_id}]`, containerHTML);
        });
        
        document.getElementById('clozeText').innerHTML = clozeHTML;
        
        // Add click event listeners to all cloze options
        document.querySelectorAll('.cloze-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleOptionClick(e.target);
            });
        });
    }
    
    handleOptionClick(optionElement) {
        const blankId = parseInt(optionElement.dataset.blankId);
        const selectedOption = optionElement.dataset.option;
        const container = optionElement.parentElement;
        
        // Check if this word group is already in "chosen" state
        const isChosen = container.querySelector('.cloze-option.chosen');
        
        if (isChosen) {
            // If already chosen, show all options again
            this.showAllOptions(container, blankId);
        } else {
            // Select this option and hide others
            this.selectOption(blankId, selectedOption, container);
        }
    }
    
    selectOption(blankId, selectedOption, container) {
        this.answers[blankId] = selectedOption;
        
        // Find all options in this container
        const allOptions = container.querySelectorAll('.cloze-option');
        
        allOptions.forEach(option => {
            if (option.dataset.option === selectedOption) {
                // This is the selected option - keep it visible and mark as chosen
                option.classList.remove('fading', 'showing');
                option.classList.add('chosen');
            } else {
                // Other options - fade them out
                option.classList.add('fading');
                option.classList.remove('showing', 'chosen');
            }
        });
        
        // Check if all questions are answered
        this.checkIfAllAnswered();
        
        // Auto-save when answer is selected
        this.saveAnswers();
    }
    
    checkIfAllAnswered() {
        const totalQuestions = this.currentTextData.cloze_test.choices.length;
        const answeredQuestions = Object.keys(this.answers).length;
        
        if (answeredQuestions === totalQuestions) {
            // All questions answered - show completion popup after short delay
            setTimeout(() => {
                this.showCompletionPopup();
            }, 500);
        }
    }
    
    showCompletionPopup() {
        // Show results popup without fade to white
        document.getElementById('resultsPopup').style.display = 'flex';
        
        // Save results
        this.saveCurrentResults();
    }
    
    showAllOptions(container, blankId) {
        // Show all options again by removing fading and chosen classes
        const allOptions = container.querySelectorAll('.cloze-option');
        
        allOptions.forEach(option => {
            option.classList.remove('fading', 'chosen');
            option.classList.add('showing');
            
            // After animation, clean up classes
            setTimeout(() => {
                option.classList.remove('showing');
            }, 300);
        });
        
        // Clear the answer since user is reconsidering
        delete this.answers[blankId];
        
        // Hide popup if it was showing (user is changing answers)
        document.getElementById('resultsPopup').style.display = 'none';
    }
    
    startTimer() {
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.finishAssessment();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = timeString;
            
            // Update timer styling based on time remaining
            if (this.timeRemaining <= 30) {
                timerDisplay.classList.add('critical');
            } else if (this.timeRemaining <= 60) {
                timerDisplay.classList.add('warning');
            }
        }
    }
    
    startAutoSave() {
        // Auto-save every 10 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveAnswers();
        }, 10000);
    }
    
    async saveAnswers() {
        if (Object.keys(this.answers).length === 0) return;
        
        try {
            // Show auto-save indicator
            this.showAutoSaveIndicator();
            
            // Save current state (you could extend this to save partial results)
            console.log('Auto-saving answers:', this.answers);
            
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    showAutoSaveIndicator() {
        let indicator = document.querySelector('.auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'auto-save-indicator';
            indicator.textContent = 'Opgeslagen';
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
    
    finishAssessment() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        // Disable all cloze options
        document.querySelectorAll('.cloze-option').forEach(option => {
            option.style.pointerEvents = 'none';
        });
        
        // Fade to white
        this.fadeToWhite();
        
        // Calculate and show results after fade
        setTimeout(() => {
            this.calculateAndShowResults();
        }, 2000);
    }
    
    fadeToWhite() {
        const fadeOverlay = document.getElementById('fadeOverlay');
        if (fadeOverlay) {
            fadeOverlay.style.display = 'block';
        }
    }
    
    calculateAndShowResults() {
        // Show results popup
        document.getElementById('resultsPopup').style.display = 'flex';
        
        // Save final results
        this.saveCurrentResults();
    }
    
    saveCurrentResults() {
        const totalQuestions = this.currentTextData.cloze_test.choices.length;
        const totalAnswered = Object.keys(this.answers).length;
        let correctAnswers = 0;
        
        // Check answers
        this.currentTextData.cloze_test.choices.forEach(choice => {
            const userAnswer = this.answers[choice.blank_id];
            if (userAnswer === choice.correct_answer) {
                correctAnswers++;
            }
        });
        
        const timeSpent = 120 - this.timeRemaining;
        const wcpm = Math.round((correctAnswers / timeSpent) * 60); // Words Correct Per Minute
        
        // Save results
        this.saveResults({
            textId: this.selectedTextId,
            textTitle: this.currentTextData.title,
            totalQuestions: totalQuestions,
            totalAnswered: totalAnswered,
            correctAnswers: correctAnswers,
            accuracy: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0,
            timeSpent: timeSpent,
            wcpm: wcpm,
            answers: this.answers
        });
    }
    
    async saveResults(results) {
        try {
            const response = await fetch('/api/cbm/save-result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    textId: results.textId,
                    textTitle: results.textTitle,
                    totalQuestions: results.totalQuestions,
                    totalAnswered: results.totalAnswered,
                    correctAnswers: results.correctAnswers,
                    accuracy: results.accuracy,
                    timeSpent: results.timeSpent,
                    wcpm: results.wcpm,
                    answers: JSON.stringify(results.answers)
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save results');
            }
            
            console.log('Results saved successfully');
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }
    
    setupEventListeners() {
        // Close results button
        document.getElementById('closeResults')?.addEventListener('click', () => {
            document.getElementById('resultsPopup').style.display = 'none';
            // Optionally redirect or reset
        });
    }
}

// Initialize when DOM is loaded - this is called from the HTML