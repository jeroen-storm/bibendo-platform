// CBM Assessment JavaScript - Simplified UX

class CBMAssessment {
    constructor(userId, textId) {
        this.userId = userId;
        this.selectedTextId = parseInt(textId) || 2;
        this.timeRemaining = 120; // 2 minutes in seconds
        this.timer = null;
        this.answers = {};
        this.currentTextData = null;
        this.autoSaveInterval = null;
        
        // CBM Text Data (same as before but structured for direct display)
        this.cbmTexts = {
            2: {
                id: 2,
                title: "Nieuwe Sneakerstyle",
                type: "cloze_test",
                cloze_test: {
                    text_with_blanks: `De laatste jaren zijn er veel nieuwe trends in sneakers ontstaan. Retro sneakers zijn weer helemaal [BLANK_1] geworden. Veel merken brengen oude designs terug, maar dan met moderne materialen en [BLANK_2]. Deze combinatie van nostalgie en innovatie spreekt veel jongeren aan.

Daarnaast zien we een trend naar [BLANK_3] sneakers. Deze schoenen hebben eenvoudige designs en neutrale kleuren. Ze passen goed bij verschillende kledingstijlen en zijn geschikt voor verschillende [BLANK_4].

Een andere belangrijke trend is [BLANK_5]. Steeds meer merken gebruiken gerecyclede materialen om hun sneakers te maken. Jongeren vinden het belangrijk dat hun kleding [BLANK_6] is.

Ook tech sneakers worden steeds [BLANK_7]. Deze schoenen hebben futuristische designs en speciale functies, zoals LED-verlichting of zelfbindende veters. Ze appelleren aan jongeren die van [BLANK_8] houden.

Personalisatie is ook een grote [BLANK_9]. Veel merken bieden nu de mogelijkheid om sneakers aan te passen met verschillende kleuren, materialen en designs. Dit geeft jongeren de kans om hun eigen [BLANK_10] stijl te creëren.

Tot slot zijn slip-on sneakers zonder veters erg [BLANK_11] geworden. Ze zijn gemakkelijk aan en uit te trekken en hebben een casual uitstraling die goed past bij de moderne [BLANK_12].`,
                    choices: [
                        { blank_id: 1, options: ["populair", "duur", "moeilijk"], correct_answer: "populair" },
                        { blank_id: 2, options: ["prijzen", "technologieën", "winkels"], correct_answer: "technologieën" },
                        { blank_id: 3, options: ["grote", "minimalistische", "kleurrijke"], correct_answer: "minimalistische" },
                        { blank_id: 4, options: ["gelegenheden", "mensen", "winkels"], correct_answer: "gelegenheden" },
                        { blank_id: 5, options: ["mode", "duurzaamheid", "prijs"], correct_answer: "duurzaamheid" },
                        { blank_id: 6, options: ["mooi", "goedkoop", "milieuvriendelijk"], correct_answer: "milieuvriendelijk" },
                        { blank_id: 7, options: ["duurder", "populairder", "kleiner"], correct_answer: "populairder" },
                        { blank_id: 8, options: ["sport", "mode", "technologie"], correct_answer: "technologie" },
                        { blank_id: 9, options: ["trend", "probleem", "vraag"], correct_answer: "trend" },
                        { blank_id: 10, options: ["dure", "unieke", "nieuwe"], correct_answer: "unieke" },
                        { blank_id: 11, options: ["populair", "duur", "zeldzaam"], correct_answer: "populair" },
                        { blank_id: 12, options: ["tijd", "levensstijl", "mode"], correct_answer: "levensstijl" }
                    ]
                }
            },
            3: {
                id: 3,
                title: "Product Launch - SneakLab",
                type: "cloze_test",
                cloze_test: {
                    text_with_blanks: `Een succesvolle productlancering vereist zorgvuldige planning en [BLANK_1]. SneakLab, een populaire sneakerwinkel, heeft dit jaar verschillende nieuwe [BLANK_2] gelanceerd. Hun aanpak kan als voorbeeld dienen voor andere [BLANK_3].

De eerste stap is het creëren van [BLANK_4]. SneakLab gebruikt sociale media om teasers te delen en hun volgers [BLANK_5] te maken. Ze posten mysterieuze foto's en hints over wat er komt.

Vervolgens organiseren ze speciale [BLANK_6] voor de lancering. Deze evenementen zijn meer dan alleen een verkoop; ze creëren een [BLANK_7]. Klanten kunnen de nieuwe producten uitproberen, er zijn DJ's en soms zelfs kleine [BLANK_8].

SneakLab werkt ook samen met influencers en lokale [BLANK_9]. Deze partnerships helpen om een bredere doelgroep te bereiken en geven de lancering meer [BLANK_10].

Een ander belangrijk aspect is het [BLANK_11] achter het product. SneakLab vertelt altijd het verhaal van hoe een sneaker tot stand is gekomen, welke materialen zijn gebruikt, en wat het [BLANK_12] maakt.

Tot slot besteden ze veel aandacht aan duurzaamheid en sociale [BLANK_13]. Ze laten zien hoe hun nieuwe producten bijdragen aan een betere wereld, wat belangrijk is voor hun jonge [BLANK_14].`,
                    choices: [
                        { blank_id: 1, options: ["voorbereiding", "verkoop", "reclame"], correct_answer: "voorbereiding" },
                        { blank_id: 2, options: ["winkels", "collecties", "prijzen"], correct_answer: "collecties" },
                        { blank_id: 3, options: ["bedrijven", "klanten", "producten"], correct_answer: "bedrijven" },
                        { blank_id: 4, options: ["verwachting", "producten", "winst"], correct_answer: "verwachting" },
                        { blank_id: 5, options: ["blij", "nieuwsgierig", "boos"], correct_answer: "nieuwsgierig" },
                        { blank_id: 6, options: ["events", "foto's", "prijzen"], correct_answer: "events" },
                        { blank_id: 7, options: ["probleem", "ervaring", "winkel"], correct_answer: "ervaring" },
                        { blank_id: 8, options: ["concerten", "winkels", "problemen"], correct_answer: "concerten" },
                        { blank_id: 9, options: ["klanten", "artiesten", "bedrijven"], correct_answer: "artiesten" },
                        { blank_id: 10, options: ["problemen", "kosten", "authenticiteit"], correct_answer: "authenticiteit" },
                        { blank_id: 11, options: ["verhaal", "prijs", "kleur"], correct_answer: "verhaal" },
                        { blank_id: 12, options: ["duur", "bijzonder", "groot"], correct_answer: "bijzonder" },
                        { blank_id: 13, options: ["media", "verantwoordelijkheid", "verkoop"], correct_answer: "verantwoordelijkheid" },
                        { blank_id: 14, options: ["doelgroep", "wereld", "tijd"], correct_answer: "doelgroep" }
                    ]
                }
            }
        };
        
        this.init();
    }
    
    init() {
        console.log('CBM Assessment initialized for user:', this.userId, 'text:', this.selectedTextId);
        
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