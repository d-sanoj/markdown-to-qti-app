const fs = require('fs');
const { DOMParser, XMLSerializer } = require('xmldom');
const JSZip = require('jszip');
const { v4: uuidv4 } = require('uuid');

class MarkdownToQTI {
    constructor() {
        this.questions = [];
        this.quizTitle = "Imported Quiz";
    }

    // Generate random numeric ID for Canvas compatibility
    generateNumericId() {
        return Math.floor(Math.random() * 10000).toString();
    }

    parseMarkdown(mdContent) {
        const lines = mdContent.trim().split('\n');
        let currentQuestion = null;
        let currentText = [];
        let feedbackType = null;
        let inQuestion = false;
        let questionCounter = 0;

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const lineStripped = line.trim();

            // Quiz title (starts with #)
            if (lineStripped.startsWith('# ') && !inQuestion) {
                this.quizTitle = lineStripped.substring(2).trim();
                i++;
                continue;
            }

            // New question starts with ##
            if (lineStripped.startsWith('## ')) {
                if (currentQuestion) {
                    currentQuestion.text = currentText.join('\n').trim();
                    this.questions.push(currentQuestion);
                }

                questionCounter++;

                // Extract question text, removing number prefix if present
                let questionText = lineStripped.substring(3).trim();
                questionText = questionText.replace(/^\d+\.\s*/, '');

                currentQuestion = {
                    title: `Question ${questionCounter}`,
                    displayText: questionText,
                    text: '',
                    type: 'essay_question',
                    answers: [],
                    points: 1.0,
                    feedbackCorrect: '',
                    feedbackIncorrect: '',
                    feedbackNeutral: '',
                    matchingPairs: [],
                    blanks: {},
                    tolerance: 0
                };
                currentText = [];
                feedbackType = null;
                inQuestion = true;
                i++;
                continue;
            }

            // Custom title
            if (lineStripped.startsWith('Title:') && currentQuestion) {
                const customTitle = lineStripped.split(':', 2)[1].trim();
                currentQuestion.title = customTitle;
                i++;
                continue;
            }

            // Question type identifier
            if (lineStripped.startsWith('Type:') && currentQuestion) {
                const qType = lineStripped.split(':', 2)[1].trim().toLowerCase();
                const typeMapping = {
                    'multiple_choice': 'multiple_choice_question',
                    'true_false': 'true_false_question',
                    'fill_in_blank': 'short_answer_question',
                    'fill_in_multiple_blanks': 'fill_in_multiple_blanks_question',
                    'multiple_answers': 'multiple_answers_question',
                    'matching': 'matching_question',
                    'numerical': 'numerical_question',
                    'essay': 'essay_question',
                    'file_upload': 'file_upload_question',
                    'text': 'text_only_question',
                    'calculated': 'calculated_question'
                };
                if (typeMapping[qType]) {
                    currentQuestion.type = typeMapping[qType];
                }
                i++;
                continue;
            }

            // Points
            if (lineStripped.startsWith('Points:') && currentQuestion) {
                try {
                    const points = parseFloat(lineStripped.split(':', 2)[1].trim());
                    currentQuestion.points = points;
                } catch (e) {
                    // ignore
                }
                i++;
                continue;
            }

            // Feedback sections
            if (lineStripped.startsWith('Feedback_Correct:')) {
                feedbackType = 'correct';
                i++;
                continue;
            } else if (lineStripped.startsWith('Feedback_Incorrect:')) {
                feedbackType = 'incorrect';
                i++;
                continue;
            } else if (lineStripped.startsWith('Feedback_Neutral:')) {
                feedbackType = 'neutral';
                i++;
                continue;
            } else if (lineStripped.startsWith('End_Feedback')) {
                feedbackType = null;
                i++;
                continue;
            }

            // Capture feedback content
            if (feedbackType === 'correct') {
                currentQuestion.feedbackCorrect += lineStripped + '\n';
                i++;
                continue;
            } else if (feedbackType === 'incorrect') {
                currentQuestion.feedbackIncorrect += lineStripped + '\n';
                i++;
                continue;
            } else if (feedbackType === 'neutral') {
                currentQuestion.feedbackNeutral += lineStripped + '\n';
                i++;
                continue;
            }

            // Matching pairs
            if (lineStripped.startsWith('Match:') && currentQuestion) {
                const matchData = lineStripped.substring(6).trim();
                if (matchData.includes('=')) {
                    const [left, right] = matchData.split('=', 2);
                    currentQuestion.matchingPairs.push({
                        left: left.trim(),
                        right: right.trim()
                    });
                }
                i++;
                continue;
            }

            // Blank answers
            if (lineStripped.startsWith('Blank:') && currentQuestion) {
                const blankData = lineStripped.substring(6).trim();
                if (blankData.includes('=')) {
                    const [blankId, answers] = blankData.split('=', 2);
                    const blankIdTrimmed = blankId.trim();
                    const answerList = answers.split('|').map(a => a.trim());
                    currentQuestion.blanks[blankIdTrimmed] = answerList;
                }
                i++;
                continue;
            }

            // Tolerance
            if (lineStripped.startsWith('Tolerance:') && currentQuestion) {
                try {
                    currentQuestion.tolerance = parseFloat(lineStripped.split(':', 2)[1].trim());
                } catch (e) {
                    // ignore
                }
                i++;
                continue;
            }

            // Formula for calculated questions
            if (lineStripped.startsWith('Formula:') && currentQuestion) {
                currentQuestion.formula = lineStripped.split(':', 2)[1].trim();
                i++;
                continue;
            }

            // Correct answer indicator (*)
            if (lineStripped.startsWith('* ') && currentQuestion) {
                const answerText = lineStripped.substring(2).trim();
                
                currentQuestion.answers.push({
                    text: answerText,
                    correct: true
                });
                i++;
                continue;
            }

            // Wrong answer indicator (-)
            if (lineStripped.startsWith('- ') && currentQuestion) {
                const answerText = lineStripped.substring(2).trim();
                
                currentQuestion.answers.push({
                    text: answerText,
                    correct: false
                });
                i++;
                continue;
            }

            // Question text
            if (lineStripped && currentQuestion && feedbackType === null) {
                if (currentQuestion.type !== 'fill_in_multiple_blanks_question') {
                    currentText.push(lineStripped);
                }
            }

            i++;
        }

        // Add last question
        if (currentQuestion) {
            currentQuestion.text = currentText.join('\n').trim();
            currentQuestion.feedbackCorrect = currentQuestion.feedbackCorrect.trim();
            currentQuestion.feedbackIncorrect = currentQuestion.feedbackIncorrect.trim();
            currentQuestion.feedbackNeutral = currentQuestion.feedbackNeutral.trim();
            this.questions.push(currentQuestion);
        }
    }

    createQTIXML() {
        const doc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?>', 'text/xml');
        
        const questestinterop = doc.createElement('questestinterop');
        questestinterop.setAttribute('xmlns', 'http://www.imsglobal.org/xsd/ims_qtiasiv1p2');
        questestinterop.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        questestinterop.setAttribute('xsi:schemaLocation', 'http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd');

        const assessment = doc.createElement('assessment');
        assessment.setAttribute('ident', `g${uuidv4().replace(/-/g, '').substring(0, 31)}`);
        assessment.setAttribute('title', this.quizTitle);
        questestinterop.appendChild(assessment);

        // Assessment metadata
        const qtimetadata = doc.createElement('qtimetadata');
        this.addMetadata(doc, qtimetadata, 'cc_maxattempts', '1');
        assessment.appendChild(qtimetadata);

        const section = doc.createElement('section');
        section.setAttribute('ident', 'root_section');
        assessment.appendChild(section);

        for (const q of this.questions) {
            this.createQuestionItem(doc, section, q);
        }

        return questestinterop;
    }

    createQuestionItem(doc, parent, question) {
        const itemId = `g${uuidv4().replace(/-/g, '').substring(0, 31)}`;

        const item = doc.createElement('item');
        item.setAttribute('ident', itemId);
        item.setAttribute('title', question.title);
        parent.appendChild(item);

        const itemmetadata = doc.createElement('itemmetadata');
        const qtimetadata = doc.createElement('qtimetadata');
        itemmetadata.appendChild(qtimetadata);
        item.appendChild(itemmetadata);

        // Question type metadata
        this.addMetadata(doc, qtimetadata, 'question_type', question.type);
        this.addMetadata(doc, qtimetadata, 'points_possible', question.points.toString());
        this.addMetadata(doc, qtimetadata, 'assessment_question_identifierref', `g${uuidv4().replace(/-/g, '').substring(0, 31)}`);
        
        // Add passage metadata for text-only questions
        if (question.type === 'text_only_question') {
            this.addMetadata(doc, qtimetadata, 'passage', 'true');
        }
        
        // Add original_answer_ids for questions with answers
        if (question.answers && question.answers.length > 0) {
            const answerIds = question.answers.map(() => this.generateNumericId());
            this.addMetadata(doc, qtimetadata, 'original_answer_ids', answerIds.join(','));
        } else if (question.type === 'essay_question' || question.type === 'file_upload_question' || question.type === 'text_only_question') {
            this.addMetadata(doc, qtimetadata, 'original_answer_ids', '');
        }

        const presentation = doc.createElement('presentation');
        item.appendChild(presentation);

        const material = doc.createElement('material');
        presentation.appendChild(material);

        const mattext = doc.createElement('mattext');
        mattext.setAttribute('texttype', 'text/html');
        material.appendChild(mattext);

        // Use display_text if available
        const questionContent = question.displayText || question.text;

        if (question.type === 'fill_in_multiple_blanks_question' || 
            question.type === 'multiple_dropdowns_question') {
            mattext.textContent = `<div><p>${questionContent || ''}</p></div>`;
        } else {
            mattext.textContent = `<div><p>${questionContent || question.text}</p></div>`;
        }

        // Route to appropriate question type handler
        switch (question.type) {
            case 'multiple_choice_question':
                this.createMultipleChoice(doc, presentation, item, question);
                break;
            case 'true_false_question':
                this.createTrueFalse(doc, presentation, item, question);
                break;
            case 'multiple_answers_question':
                this.createMultipleAnswers(doc, presentation, item, question);
                break;
            case 'essay_question':
                this.createEssayQuestion(doc, presentation, item, question);
                break;
            case 'short_answer_question':
                this.createFillInBlank(doc, presentation, item, question);
                break;
            case 'fill_in_multiple_blanks_question':
                this.createFillInMultipleBlanks(doc, presentation, item, question);
                break;
            case 'matching_question':
                this.createMatchingQuestion(doc, presentation, item, question, itemmetadata, qtimetadata);
                break;
            case 'numerical_question':
                this.createNumericalQuestion(doc, presentation, item, question, itemmetadata, qtimetadata);
                break;
            case 'file_upload_question':
                this.createFileUploadQuestion(doc, presentation, item, question);
                break;
            case 'text_only_question':
                break;
            case 'calculated_question':
                this.createCalculatedQuestion(doc, presentation, item, question);
                break;
        }

        // Add feedback
        this.addFeedback(doc, item, question);
    }

    createMultipleChoice(doc, presentation, item, question) {
        const responseLid = doc.createElement('response_lid');
        responseLid.setAttribute('ident', 'response1');
        responseLid.setAttribute('rcardinality', 'Single');
        presentation.appendChild(responseLid);

        const renderChoice = doc.createElement('render_choice');
        responseLid.appendChild(renderChoice);

        const answerIds = [];
        for (let idx = 0; idx < question.answers.length; idx++) {
            const answer = question.answers[idx];
            const answerId = this.generateNumericId();
            answerIds.push(answerId);

            const responseLabel = doc.createElement('response_label');
            responseLabel.setAttribute('ident', answerId);
            renderChoice.appendChild(responseLabel);

            const material = doc.createElement('material');
            responseLabel.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/plain');
            mattext.textContent = answer.text;
            material.appendChild(mattext);
        }

        // Response processing
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);

        for (let idx = 0; idx < question.answers.length; idx++) {
            const answer = question.answers[idx];
            if (answer.correct) {
                const respcondition = doc.createElement('respcondition');
                respcondition.setAttribute('continue', 'No');
                resprocessing.appendChild(respcondition);

                const conditionvar = doc.createElement('conditionvar');
                respcondition.appendChild(conditionvar);

                const varequal = doc.createElement('varequal');
                varequal.setAttribute('respident', 'response1');
                varequal.textContent = answerIds[idx];
                conditionvar.appendChild(varequal);

                const setvar = doc.createElement('setvar');
                setvar.setAttribute('action', 'Set');
                setvar.setAttribute('varname', 'SCORE');
                setvar.textContent = '100';
                respcondition.appendChild(setvar);
            }
        }
    }

    createTrueFalse(doc, presentation, item, question) {
        const responseLid = doc.createElement('response_lid');
        responseLid.setAttribute('ident', 'response1');
        responseLid.setAttribute('rcardinality', 'Single');
        presentation.appendChild(responseLid);

        const renderChoice = doc.createElement('render_choice');
        responseLid.appendChild(renderChoice);

        // Add True and False options if not provided
        if (question.answers.length === 0) {
            question.answers = [
                { text: 'True', correct: false },
                { text: 'False', correct: false }
            ];
        }

        const answerIds = {};
        for (const answer of question.answers) {
            const answerId = this.generateNumericId();
            answerIds[answer.text] = answerId;

            const responseLabel = doc.createElement('response_label');
            responseLabel.setAttribute('ident', answerId);
            renderChoice.appendChild(responseLabel);

            const material = doc.createElement('material');
            responseLabel.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/plain');
            mattext.textContent = answer.text;
            material.appendChild(mattext);
        }

        // Response processing
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);

        for (const answer of question.answers) {
            if (answer.correct) {
                const respcondition = doc.createElement('respcondition');
                respcondition.setAttribute('continue', 'No');
                resprocessing.appendChild(respcondition);

                const conditionvar = doc.createElement('conditionvar');
                respcondition.appendChild(conditionvar);

                const varequal = doc.createElement('varequal');
                varequal.setAttribute('respident', 'response1');
                varequal.textContent = answerIds[answer.text];
                conditionvar.appendChild(varequal);

                const setvar = doc.createElement('setvar');
                setvar.setAttribute('action', 'Set');
                setvar.setAttribute('varname', 'SCORE');
                setvar.textContent = '100';
                respcondition.appendChild(setvar);
            }
        }
    }

    createMultipleAnswers(doc, presentation, item, question) {
        const responseLid = doc.createElement('response_lid');
        responseLid.setAttribute('ident', 'response1');
        responseLid.setAttribute('rcardinality', 'Multiple');
        presentation.appendChild(responseLid);

        const renderChoice = doc.createElement('render_choice');
        responseLid.appendChild(renderChoice);

        const answerIds = [];
        for (let idx = 0; idx < question.answers.length; idx++) {
            const answer = question.answers[idx];
            const answerId = this.generateNumericId();
            answerIds.push({ id: answerId, correct: answer.correct });

            const responseLabel = doc.createElement('response_label');
            responseLabel.setAttribute('ident', answerId);
            renderChoice.appendChild(responseLabel);

            const material = doc.createElement('material');
            responseLabel.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/plain');
            mattext.textContent = answer.text;
            material.appendChild(mattext);
        }

        // Response processing
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);

        // Canvas expects all correct answers to be selected and no incorrect ones
        const respcondition = doc.createElement('respcondition');
        respcondition.setAttribute('continue', 'No');
        resprocessing.appendChild(respcondition);

        const conditionvar = doc.createElement('conditionvar');
        respcondition.appendChild(conditionvar);

        const andCondition = doc.createElement('and');
        conditionvar.appendChild(andCondition);

        for (const ansObj of answerIds) {
            if (ansObj.correct) {
                const varequal = doc.createElement('varequal');
                varequal.setAttribute('respident', 'response1');
                varequal.textContent = ansObj.id;
                andCondition.appendChild(varequal);
            } else {
                const notCondition = doc.createElement('not');
                const varequal = doc.createElement('varequal');
                varequal.setAttribute('respident', 'response1');
                varequal.textContent = ansObj.id;
                notCondition.appendChild(varequal);
                andCondition.appendChild(notCondition);
            }
        }

        const setvar = doc.createElement('setvar');
        setvar.setAttribute('action', 'Set');
        setvar.setAttribute('varname', 'SCORE');
        setvar.textContent = '100';
        respcondition.appendChild(setvar);
    }

    createEssayQuestion(doc, presentation, item, question) {
        const responseStr = doc.createElement('response_str');
        responseStr.setAttribute('ident', 'response1');
        responseStr.setAttribute('rcardinality', 'Single');
        presentation.appendChild(responseStr);

        const renderFib = doc.createElement('render_fib');
        responseStr.appendChild(renderFib);

        const responseLabel = doc.createElement('response_label');
        responseLabel.setAttribute('ident', 'answer1');
        responseLabel.setAttribute('rshuffle', 'No');
        renderFib.appendChild(responseLabel);

        // Response processing
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);

        const respcondition = doc.createElement('respcondition');
        respcondition.setAttribute('continue', 'No');
        resprocessing.appendChild(respcondition);

        const conditionvar = doc.createElement('conditionvar');
        respcondition.appendChild(conditionvar);

        const other = doc.createElement('other');
        conditionvar.appendChild(other);
    }

    createFillInBlank(doc, presentation, item, question) {
        const responseStr = doc.createElement('response_str');
        responseStr.setAttribute('ident', 'response1');
        responseStr.setAttribute('rcardinality', 'Single');
        presentation.appendChild(responseStr);

        const renderFib = doc.createElement('render_fib');
        responseStr.appendChild(renderFib);

        const responseLabel = doc.createElement('response_label');
        responseLabel.setAttribute('ident', 'answer1');
        responseLabel.setAttribute('rshuffle', 'No');
        renderFib.appendChild(responseLabel);

        if (question.answers.length > 0) {
            const resprocessing = doc.createElement('resprocessing');
            item.appendChild(resprocessing);

            const outcomes = doc.createElement('outcomes');
            resprocessing.appendChild(outcomes);

            const decvar = doc.createElement('decvar');
            decvar.setAttribute('maxvalue', '100');
            decvar.setAttribute('minvalue', '0');
            decvar.setAttribute('varname', 'SCORE');
            decvar.setAttribute('vartype', 'Decimal');
            outcomes.appendChild(decvar);

            const respcondition = doc.createElement('respcondition');
            respcondition.setAttribute('continue', 'No');
            resprocessing.appendChild(respcondition);

            const conditionvar = doc.createElement('conditionvar');
            respcondition.appendChild(conditionvar);

            // Multiple possible answers in conditionvar
            for (const answer of question.answers) {
                if (answer.correct) {
                    const varequal = doc.createElement('varequal');
                    varequal.setAttribute('respident', 'response1');
                    varequal.textContent = answer.text;
                    conditionvar.appendChild(varequal);
                }
            }

            const setvar = doc.createElement('setvar');
            setvar.setAttribute('action', 'Set');
            setvar.setAttribute('varname', 'SCORE');
            setvar.textContent = '100';
            respcondition.appendChild(setvar);
        }
    }

    createFillInMultipleBlanks(doc, presentation, item, question) {
        // Store answer IDs for response processing
        const answerIdMap = new Map();
        
        // Create response_lid for each blank with its specific answers
        for (const blankId of Object.keys(question.blanks)) {
            const responseLid = doc.createElement('response_lid');
            responseLid.setAttribute('ident', `response_${blankId}`);
            presentation.appendChild(responseLid);

            const material = doc.createElement('material');
            responseLid.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.textContent = blankId;
            material.appendChild(mattext);

            const renderChoice = doc.createElement('render_choice');
            responseLid.appendChild(renderChoice);

            // Add answer choices for this blank and store IDs
            const correctAnswers = question.blanks[blankId];
            const blankAnswerIds = [];
            for (const ansText of correctAnswers) {
                const answerId = this.generateNumericId();
                blankAnswerIds.push(answerId);
                
                const responseLabel = doc.createElement('response_label');
                responseLabel.setAttribute('ident', answerId);
                renderChoice.appendChild(responseLabel);

                const respMaterial = doc.createElement('material');
                responseLabel.appendChild(respMaterial);

                const respMattext = doc.createElement('mattext');
                respMattext.setAttribute('texttype', 'text/plain');
                respMattext.textContent = ansText;
                respMaterial.appendChild(respMattext);
            }
            answerIdMap.set(blankId, blankAnswerIds);
        }

        if (Object.keys(question.blanks).length > 0) {
            const resprocessing = doc.createElement('resprocessing');
            item.appendChild(resprocessing);

            const outcomes = doc.createElement('outcomes');
            resprocessing.appendChild(outcomes);

            const decvar = doc.createElement('decvar');
            decvar.setAttribute('maxvalue', '100');
            decvar.setAttribute('minvalue', '0');
            decvar.setAttribute('varname', 'SCORE');
            decvar.setAttribute('vartype', 'Decimal');
            outcomes.appendChild(decvar);

            const pointsPerBlank = 100 / Object.keys(question.blanks).length;

            // Create response conditions for each blank using stored answer IDs
            for (const [blankId, answerIds] of answerIdMap.entries()) {
                for (const answerId of answerIds) {
                    const respcondition = doc.createElement('respcondition');
                    resprocessing.appendChild(respcondition);

                    const conditionvar = doc.createElement('conditionvar');
                    respcondition.appendChild(conditionvar);

                    const varequal = doc.createElement('varequal');
                    varequal.setAttribute('respident', `response_${blankId}`);
                    varequal.textContent = answerId;
                    conditionvar.appendChild(varequal);

                    const setvar = doc.createElement('setvar');
                    setvar.setAttribute('action', 'Add');
                    setvar.setAttribute('varname', 'SCORE');
                    setvar.textContent = pointsPerBlank.toFixed(2);
                    respcondition.appendChild(setvar);
                }
            }
        }
    }


    createMatchingQuestion(doc, presentation, item, question, itemmetadata, qtimetadata) {
        this.addMetadata(doc, qtimetadata, 'bb_question_type', 'Matching');

        // Generate IDs for all left items and right items
        const leftIds = [];
        const rightIds = [];
        
        for (let i = 0; i < question.matchingPairs.length; i++) {
            leftIds.push(this.generateNumericId());
            rightIds.push(this.generateNumericId());
        }

        // Create response_lid for each left item
        for (let idx = 0; idx < question.matchingPairs.length; idx++) {
            const pair = question.matchingPairs[idx];
            const responseLid = doc.createElement('response_lid');
            responseLid.setAttribute('ident', `response_${leftIds[idx]}`);
            presentation.appendChild(responseLid);

            const material = doc.createElement('material');
            responseLid.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/plain');
            mattext.textContent = pair.left;
            material.appendChild(mattext);

            const renderChoice = doc.createElement('render_choice');
            responseLid.appendChild(renderChoice);

            // Add all right items as choices
            for (let choiceIdx = 0; choiceIdx < question.matchingPairs.length; choiceIdx++) {
                const choicePair = question.matchingPairs[choiceIdx];
                const responseLabel = doc.createElement('response_label');
                responseLabel.setAttribute('ident', rightIds[choiceIdx]);
                renderChoice.appendChild(responseLabel);

                const respMaterial = doc.createElement('material');
                responseLabel.appendChild(respMaterial);

                const respMattext = doc.createElement('mattext');
                respMattext.textContent = choicePair.right;
                respMaterial.appendChild(respMattext);
            }
        }

        // Response processing for matching
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);

        const pointsPerMatch = question.matchingPairs.length > 0 ? 100 / question.matchingPairs.length : 0;

        for (let idx = 0; idx < question.matchingPairs.length; idx++) {
            const respcondition = doc.createElement('respcondition');
            resprocessing.appendChild(respcondition);

            const conditionvar = doc.createElement('conditionvar');
            respcondition.appendChild(conditionvar);

            const varequal = doc.createElement('varequal');
            varequal.setAttribute('respident', `response_${leftIds[idx]}`);
            varequal.textContent = rightIds[idx];
            conditionvar.appendChild(varequal);

            const setvar = doc.createElement('setvar');
            setvar.setAttribute('action', 'Add');
            setvar.setAttribute('varname', 'SCORE');
            setvar.textContent = pointsPerMatch.toFixed(2);
            respcondition.appendChild(setvar);
        }
    }

    createNumericalQuestion(doc, presentation, item, question, itemmetadata, qtimetadata) {
        // Add answer metadata that Canvas needs
        if (question.answers.length > 0 && question.answers[0].correct) {
            try {
                const exactVal = parseFloat(question.answers[0].text);
                const tolerance = question.tolerance || 0;
                
                // These metadata fields are critical for Canvas to recognize the answer
                this.addMetadata(doc, qtimetadata, 'assessment_question_identifierref', item.getAttribute('ident'));
                
                // Add the answer and tolerance as metadata
                const answerId = `answer_${Date.now()}`;
                this.addMetadata(doc, qtimetadata, 'answer_' + answerId, exactVal.toString());
                this.addMetadata(doc, qtimetadata, 'answer_tolerance_' + answerId, tolerance.toString());
                this.addMetadata(doc, qtimetadata, 'answer_type_' + answerId, 'exact_answer');
            } catch (e) {
                // ignore
            }
        }

        const responseStr = doc.createElement('response_str');
        responseStr.setAttribute('ident', 'response1');
        responseStr.setAttribute('rcardinality', 'Single');
        presentation.appendChild(responseStr);

        const renderFib = doc.createElement('render_fib');
        renderFib.setAttribute('fibtype', 'Decimal');
        renderFib.setAttribute('prompt', 'Box');
        renderFib.setAttribute('rows', '1');
        renderFib.setAttribute('maxchars', '0');
        responseStr.appendChild(renderFib);

        const responseLabel = doc.createElement('response_label');
        responseLabel.setAttribute('ident', 'answer1');
        responseLabel.setAttribute('rshuffle', 'No');
        renderFib.appendChild(responseLabel);

        if (question.answers.length > 0) {
            const resprocessing = doc.createElement('resprocessing');
            item.appendChild(resprocessing);

            const outcomes = doc.createElement('outcomes');
            resprocessing.appendChild(outcomes);

            const decvar = doc.createElement('decvar');
            decvar.setAttribute('maxvalue', '100');
            decvar.setAttribute('minvalue', '0');
            decvar.setAttribute('varname', 'SCORE');
            decvar.setAttribute('vartype', 'Decimal');
            outcomes.appendChild(decvar);

            for (const answer of question.answers) {
                if (answer.correct) {
                    try {
                        const exactVal = parseFloat(answer.text);
                        const tolerance = question.tolerance || 0;

                        const respcondition = doc.createElement('respcondition');
                        respcondition.setAttribute('continue', 'No');
                        resprocessing.appendChild(respcondition);

                        const conditionvar = doc.createElement('conditionvar');
                        respcondition.appendChild(conditionvar);

                        const andCondition = doc.createElement('and');
                        conditionvar.appendChild(andCondition);

                        const vargte = doc.createElement('vargte');
                        vargte.setAttribute('respident', 'response1');
                        vargte.textContent = (exactVal - tolerance).toString();
                        andCondition.appendChild(vargte);

                        const varlte = doc.createElement('varlte');
                        varlte.setAttribute('respident', 'response1');
                        varlte.textContent = (exactVal + tolerance).toString();
                        andCondition.appendChild(varlte);

                        const setvar = doc.createElement('setvar');
                        setvar.setAttribute('action', 'Set');
                        setvar.setAttribute('varname', 'SCORE');
                        setvar.textContent = '100';
                        respcondition.appendChild(setvar);

                        if (question.feedbackCorrect) {
                            const displayfeedback = doc.createElement('displayfeedback');
                            displayfeedback.setAttribute('feedbacktype', 'Response');
                            displayfeedback.setAttribute('linkrefid', 'correct_fb');
                            respcondition.appendChild(displayfeedback);
                        }

                    } catch (e) {
                        // ignore invalid number
                    }
                }
            }

            if (question.feedbackIncorrect) {
                const respcondition = doc.createElement('respcondition');
                respcondition.setAttribute('continue', 'Yes');
                resprocessing.appendChild(respcondition);

                const conditionvar = doc.createElement('conditionvar');
                respcondition.appendChild(conditionvar);

                const other = doc.createElement('other');
                conditionvar.appendChild(other);

                const displayfeedback = doc.createElement('displayfeedback');
                displayfeedback.setAttribute('feedbacktype', 'Response');
                displayfeedback.setAttribute('linkrefid', 'incorrect_fb');
                respcondition.appendChild(displayfeedback);
            }
        }
    }

    createFileUploadQuestion(doc, presentation, item, question) {
        // File upload questions don't need response_str in Canvas format
        // The presentation only contains the question text

        // Response processing
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);
    }

    createCalculatedQuestion(doc, presentation, item, question) {
        const responseStr = doc.createElement('response_str');
        responseStr.setAttribute('ident', 'response1');
        responseStr.setAttribute('rcardinality', 'Single');
        presentation.appendChild(responseStr);

        const renderFib = doc.createElement('render_fib');
        renderFib.setAttribute('fibtype', 'Decimal');
        responseStr.appendChild(renderFib);

        const responseLabel = doc.createElement('response_label');
        responseLabel.setAttribute('ident', 'answer1');
        renderFib.appendChild(responseLabel);

        // Response processing
        const resprocessing = doc.createElement('resprocessing');
        item.appendChild(resprocessing);

        const outcomes = doc.createElement('outcomes');
        resprocessing.appendChild(outcomes);

        const decvar = doc.createElement('decvar');
        decvar.setAttribute('maxvalue', '100');
        decvar.setAttribute('minvalue', '0');
        decvar.setAttribute('varname', 'SCORE');
        decvar.setAttribute('vartype', 'Decimal');
        outcomes.appendChild(decvar);

        // Correct condition
        const respcondition = doc.createElement('respcondition');
        respcondition.setAttribute('title', 'correct');
        resprocessing.appendChild(respcondition);

        const conditionvar = doc.createElement('conditionvar');
        respcondition.appendChild(conditionvar);

        const other = doc.createElement('other');
        conditionvar.appendChild(other);

        const setvar = doc.createElement('setvar');
        setvar.setAttribute('action', 'Set');
        setvar.setAttribute('varname', 'SCORE');
        setvar.textContent = '100';
        respcondition.appendChild(setvar);

        // Incorrect condition
        const respcondition2 = doc.createElement('respcondition');
        respcondition2.setAttribute('title', 'incorrect');
        resprocessing.appendChild(respcondition2);

        const conditionvar2 = doc.createElement('conditionvar');
        respcondition2.appendChild(conditionvar2);

        const not = doc.createElement('not');
        conditionvar2.appendChild(not);

        const other2 = doc.createElement('other');
        not.appendChild(other2);

        const setvar2 = doc.createElement('setvar');
        setvar2.setAttribute('action', 'Set');
        setvar2.setAttribute('varname', 'SCORE');
        setvar2.textContent = '0';
        respcondition2.appendChild(setvar2);

        // Add itemproc_extension for calculated question
        const itemprocExtension = doc.createElement('itemproc_extension');
        item.appendChild(itemprocExtension);

        const calculated = doc.createElement('calculated');
        itemprocExtension.appendChild(calculated);

        const answerTolerance = doc.createElement('answer_tolerance');
        answerTolerance.textContent = question.tolerance || '1';
        calculated.appendChild(answerTolerance);

        const formulas = doc.createElement('formulas');
        formulas.setAttribute('decimal_places', '0');
        calculated.appendChild(formulas);

        const formula = doc.createElement('formula');
        formula.textContent = question.formula || 'x+y';
        formulas.appendChild(formula);

        const vars = doc.createElement('vars');
        calculated.appendChild(vars);

        // Add variables (simplified - would need more complex parsing)
        const varX = doc.createElement('var');
        varX.setAttribute('name', 'x');
        varX.setAttribute('scale', '0');
        vars.appendChild(varX);

        const minX = doc.createElement('min');
        minX.textContent = '2.0';
        varX.appendChild(minX);

        const maxX = doc.createElement('max');
        maxX.textContent = '5.0';
        varX.appendChild(maxX);

        const varY = doc.createElement('var');
        varY.setAttribute('name', 'y');
        varY.setAttribute('scale', '0');
        vars.appendChild(varY);

        const minY = doc.createElement('min');
        minY.textContent = '6.0';
        varY.appendChild(minY);

        const maxY = doc.createElement('max');
        maxY.textContent = '9.0';
        varY.appendChild(maxY);

        const varSets = doc.createElement('var_sets');
        calculated.appendChild(varSets);

        // Add sample variable sets
        const varSet = doc.createElement('var_set');
        varSet.setAttribute('ident', this.generateNumericId());
        varSets.appendChild(varSet);

        const varXVal = doc.createElement('var');
        varXVal.setAttribute('name', 'x');
        varXVal.textContent = '4';
        varSet.appendChild(varXVal);

        const varYVal = doc.createElement('var');
        varYVal.setAttribute('name', 'y');
        varYVal.textContent = '7';
        varSet.appendChild(varYVal);

        const answer = doc.createElement('answer');
        answer.textContent = '11.0';
        varSet.appendChild(answer);
    }

    addFeedback(doc, item, question) {
        // Neutral feedback
        if (question.feedbackNeutral) {
            const itemfeedback = doc.createElement('itemfeedback');
            itemfeedback.setAttribute('ident', 'general_fb');
            item.appendChild(itemfeedback);

            const flowMat = doc.createElement('flow_mat');
            itemfeedback.appendChild(flowMat);

            const material = doc.createElement('material');
            flowMat.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/html');
            mattext.textContent = question.feedbackNeutral;
            material.appendChild(mattext);
        }

        // Correct feedback
        if (question.feedbackCorrect) {
            const itemfeedback = doc.createElement('itemfeedback');
            itemfeedback.setAttribute('ident', 'correct_fb');
            item.appendChild(itemfeedback);

            const flowMat = doc.createElement('flow_mat');
            itemfeedback.appendChild(flowMat);

            const material = doc.createElement('material');
            flowMat.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/html');
            mattext.textContent = question.feedbackCorrect;
            material.appendChild(mattext);
        }

        // Incorrect feedback
        if (question.feedbackIncorrect) {
            const itemfeedback = doc.createElement('itemfeedback');
            itemfeedback.setAttribute('ident', 'incorrect_fb');
            item.appendChild(itemfeedback);

            const flowMat = doc.createElement('flow_mat');
            itemfeedback.appendChild(flowMat);

            const material = doc.createElement('material');
            flowMat.appendChild(material);

            const mattext = doc.createElement('mattext');
            mattext.setAttribute('texttype', 'text/html');
            mattext.textContent = question.feedbackIncorrect;
            material.appendChild(mattext);
        }
    }

    addMetadata(doc, parent, label, entry) {
        const qtimetadatafield = doc.createElement('qtimetadatafield');
        parent.appendChild(qtimetadatafield);

        const fieldlabel = doc.createElement('fieldlabel');
        fieldlabel.textContent = label;
        qtimetadatafield.appendChild(fieldlabel);

        const fieldentry = doc.createElement('fieldentry');
        fieldentry.textContent = entry;
        qtimetadatafield.appendChild(fieldentry);
    }

    createManifest(assessmentId) {
        const doc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?>', 'text/xml');

        const manifest = doc.createElement('manifest');
        const manifestId = `g${uuidv4().replace(/-/g, '').substring(0, 31)}`;
        manifest.setAttribute('identifier', manifestId);
        manifest.setAttribute('xmlns', 'http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1');
        manifest.setAttribute('xmlns:lom', 'http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource');
        manifest.setAttribute('xmlns:imsmd', 'http://www.imsglobal.org/xsd/imsmd_v1p2');
        manifest.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        manifest.setAttribute('xsi:schemaLocation', 'http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2p2.xsd');

        const metadata = doc.createElement('metadata');
        manifest.appendChild(metadata);

        const schema = doc.createElement('schema');
        schema.textContent = 'IMS Content';
        metadata.appendChild(schema);

        const schemaversion = doc.createElement('schemaversion');
        schemaversion.textContent = '1.1.3';
        metadata.appendChild(schemaversion);

        const imsmdLom = doc.createElement('imsmd:lom');
        metadata.appendChild(imsmdLom);

        const general = doc.createElement('imsmd:general');
        imsmdLom.appendChild(general);

        const title = doc.createElement('imsmd:title');
        general.appendChild(title);

        const titleString = doc.createElement('imsmd:string');
        titleString.textContent = `QTI Quiz Export - ${this.quizTitle}`;
        title.appendChild(titleString);

        const lifeCycle = doc.createElement('imsmd:lifeCycle');
        imsmdLom.appendChild(lifeCycle);

        const contribute = doc.createElement('imsmd:contribute');
        lifeCycle.appendChild(contribute);

        const date = doc.createElement('imsmd:date');
        contribute.appendChild(date);

        const dateTime = doc.createElement('imsmd:dateTime');
        dateTime.textContent = new Date().toISOString().split('T')[0];
        date.appendChild(dateTime);

        const rights = doc.createElement('imsmd:rights');
        imsmdLom.appendChild(rights);

        const copyrightAndOther = doc.createElement('imsmd:copyrightAndOtherRestrictions');
        rights.appendChild(copyrightAndOther);

        const value = doc.createElement('imsmd:value');
        value.textContent = 'yes';
        copyrightAndOther.appendChild(value);

        const description = doc.createElement('imsmd:description');
        rights.appendChild(description);

        const descString = doc.createElement('imsmd:string');
        descString.textContent = 'Private (Copyrighted) - http://en.wikipedia.org/wiki/Copyright';
        description.appendChild(descString);

        const organizations = doc.createElement('organizations');
        manifest.appendChild(organizations);

        const resources = doc.createElement('resources');
        manifest.appendChild(resources);

        const resource = doc.createElement('resource');
        resource.setAttribute('identifier', assessmentId);
        resource.setAttribute('type', 'imsqti_xmlv1p2');
        resources.appendChild(resource);

        const fileElem = doc.createElement('file');
        fileElem.setAttribute('href', `${assessmentId}/${assessmentId}.xml`);
        resource.appendChild(fileElem);

        const dependency = doc.createElement('dependency');
        const depId = `g${uuidv4().replace(/-/g, '').substring(0, 31)}`;
        dependency.setAttribute('identifierref', depId);
        resource.appendChild(dependency);

        const metaResource = doc.createElement('resource');
        metaResource.setAttribute('identifier', depId);
        metaResource.setAttribute('type', 'associatedcontent/imscc_xmlv1p1/learning-application-resource');
        metaResource.setAttribute('href', `${assessmentId}/assessment_meta.xml`);
        resources.appendChild(metaResource);

        const metaFile = doc.createElement('file');
        metaFile.setAttribute('href', `${assessmentId}/assessment_meta.xml`);
        metaResource.appendChild(metaFile);

        return manifest;
    }

    createAssessmentMeta(assessmentId) {
        const doc = new DOMParser().parseFromString('<?xml version="1.0" encoding="UTF-8"?>', 'text/xml');

        const quiz = doc.createElement('quiz');
        quiz.setAttribute('identifier', assessmentId);
        quiz.setAttribute('xmlns', 'http://canvas.instructure.com/xsd/cccv1p0');
        quiz.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        quiz.setAttribute('xsi:schemaLocation', 'http://canvas.instructure.com/xsd/cccv1p0 https://canvas.instructure.com/xsd/cccv1p0.xsd');

        const title = doc.createElement('title');
        title.textContent = this.quizTitle;
        quiz.appendChild(title);

        const description = doc.createElement('description');
        quiz.appendChild(description);

        const shuffleAnswers = doc.createElement('shuffle_answers');
        shuffleAnswers.textContent = 'false';
        quiz.appendChild(shuffleAnswers);

        const scoringPolicy = doc.createElement('scoring_policy');
        scoringPolicy.textContent = 'keep_highest';
        quiz.appendChild(scoringPolicy);

        const hideResults = doc.createElement('hide_results');
        quiz.appendChild(hideResults);

        const quizType = doc.createElement('quiz_type');
        quizType.textContent = 'assignment';
        quiz.appendChild(quizType);

        const totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
        const pointsPossible = doc.createElement('points_possible');
        pointsPossible.textContent = totalPoints.toFixed(1);
        quiz.appendChild(pointsPossible);

        const requireLockdown = doc.createElement('require_lockdown_browser');
        requireLockdown.textContent = 'false';
        quiz.appendChild(requireLockdown);

        const requireLockdownResults = doc.createElement('require_lockdown_browser_for_results');
        requireLockdownResults.textContent = 'false';
        quiz.appendChild(requireLockdownResults);

        const requireLockdownMonitor = doc.createElement('require_lockdown_browser_monitor');
        requireLockdownMonitor.textContent = 'false';
        quiz.appendChild(requireLockdownMonitor);

        const lockdownMonitorData = doc.createElement('lockdown_browser_monitor_data');
        quiz.appendChild(lockdownMonitorData);

        const showCorrect = doc.createElement('show_correct_answers');
        showCorrect.textContent = 'true';
        quiz.appendChild(showCorrect);

        const anonymous = doc.createElement('anonymous_submissions');
        anonymous.textContent = 'false';
        quiz.appendChild(anonymous);

        const couldBeLocked = doc.createElement('could_be_locked');
        couldBeLocked.textContent = 'false';
        quiz.appendChild(couldBeLocked);

        const disableTimer = doc.createElement('disable_timer_autosubmission');
        disableTimer.textContent = 'false';
        quiz.appendChild(disableTimer);

        const allowedAttempts = doc.createElement('allowed_attempts');
        allowedAttempts.textContent = '1';
        quiz.appendChild(allowedAttempts);

        const oneQuestion = doc.createElement('one_question_at_a_time');
        oneQuestion.textContent = 'false';
        quiz.appendChild(oneQuestion);

        const cantGoBack = doc.createElement('cant_go_back');
        cantGoBack.textContent = 'false';
        quiz.appendChild(cantGoBack);

        const available = doc.createElement('available');
        available.textContent = 'false';
        quiz.appendChild(available);

        const oneTimeResults = doc.createElement('one_time_results');
        oneTimeResults.textContent = 'false';
        quiz.appendChild(oneTimeResults);

        const showCorrectLast = doc.createElement('show_correct_answers_last_attempt');
        showCorrectLast.textContent = 'false';
        quiz.appendChild(showCorrectLast);

        const onlyVisible = doc.createElement('only_visible_to_overrides');
        onlyVisible.textContent = 'false';
        quiz.appendChild(onlyVisible);

        const moduleLocked = doc.createElement('module_locked');
        moduleLocked.textContent = 'false';
        quiz.appendChild(moduleLocked);

        const assignment = doc.createElement('assignment');
        const assignmentId = `g${uuidv4().replace(/-/g, '').substring(0, 31)}`;
        assignment.setAttribute('identifier', assignmentId);
        quiz.appendChild(assignment);

        const assignTitle = doc.createElement('title');
        assignTitle.textContent = this.quizTitle;
        assignment.appendChild(assignTitle);

        const dueAt = doc.createElement('due_at');
        assignment.appendChild(dueAt);

        const lockAt = doc.createElement('lock_at');
        assignment.appendChild(lockAt);

        const unlockAt = doc.createElement('unlock_at');
        assignment.appendChild(unlockAt);

        const assignModuleLocked = doc.createElement('module_locked');
        assignModuleLocked.textContent = 'false';
        assignment.appendChild(assignModuleLocked);

        const workflowState = doc.createElement('workflow_state');
        workflowState.textContent = 'unpublished';
        assignment.appendChild(workflowState);

        const assignmentOverrides = doc.createElement('assignment_overrides');
        assignment.appendChild(assignmentOverrides);

        const quizIdRef = doc.createElement('quiz_identifierref');
        quizIdRef.textContent = assessmentId;
        assignment.appendChild(quizIdRef);

        const allowedExtensions = doc.createElement('allowed_extensions');
        assignment.appendChild(allowedExtensions);

        const hasGroupCategory = doc.createElement('has_group_category');
        hasGroupCategory.textContent = 'false';
        assignment.appendChild(hasGroupCategory);

        const assignPoints = doc.createElement('points_possible');
        assignPoints.textContent = totalPoints.toFixed(1);
        assignment.appendChild(assignPoints);

        const gradingType = doc.createElement('grading_type');
        gradingType.textContent = 'points';
        assignment.appendChild(gradingType);

        const allDay = doc.createElement('all_day');
        allDay.textContent = 'false';
        assignment.appendChild(allDay);

        const submissionTypes = doc.createElement('submission_types');
        submissionTypes.textContent = 'online_quiz';
        assignment.appendChild(submissionTypes);

        const position = doc.createElement('position');
        position.textContent = '1';
        assignment.appendChild(position);

        const turnitin = doc.createElement('turnitin_enabled');
        turnitin.textContent = 'false';
        assignment.appendChild(turnitin);

        const vericite = doc.createElement('vericite_enabled');
        vericite.textContent = 'false';
        assignment.appendChild(vericite);

        const peerReviewCount = doc.createElement('peer_review_count');
        peerReviewCount.textContent = '0';
        assignment.appendChild(peerReviewCount);

        const peerReviews = doc.createElement('peer_reviews');
        peerReviews.textContent = 'false';
        assignment.appendChild(peerReviews);

        const autoPeerReviews = doc.createElement('automatic_peer_reviews');
        autoPeerReviews.textContent = 'false';
        assignment.appendChild(autoPeerReviews);

        const anonPeerReviews = doc.createElement('anonymous_peer_reviews');
        anonPeerReviews.textContent = 'false';
        assignment.appendChild(anonPeerReviews);

        const gradeIndividually = doc.createElement('grade_group_students_individually');
        gradeIndividually.textContent = 'false';
        assignment.appendChild(gradeIndividually);

        const freezeOnCopy = doc.createElement('freeze_on_copy');
        freezeOnCopy.textContent = 'false';
        assignment.appendChild(freezeOnCopy);

        const omitFromFinal = doc.createElement('omit_from_final_grade');
        omitFromFinal.textContent = 'false';
        assignment.appendChild(omitFromFinal);

        const hideInGradebook = doc.createElement('hide_in_gradebook');
        hideInGradebook.textContent = 'false';
        assignment.appendChild(hideInGradebook);

        const intraGroup = doc.createElement('intra_group_peer_reviews');
        intraGroup.textContent = 'false';
        assignment.appendChild(intraGroup);

        const onlyVisibleAssign = doc.createElement('only_visible_to_overrides');
        onlyVisibleAssign.textContent = 'false';
        assignment.appendChild(onlyVisibleAssign);

        const postToSis = doc.createElement('post_to_sis');
        postToSis.textContent = 'false';
        assignment.appendChild(postToSis);

        const moderatedGrading = doc.createElement('moderated_grading');
        moderatedGrading.textContent = 'false';
        assignment.appendChild(moderatedGrading);

        const graderCount = doc.createElement('grader_count');
        graderCount.textContent = '0';
        assignment.appendChild(graderCount);

        const graderCommentsVisible = doc.createElement('grader_comments_visible_to_graders');
        graderCommentsVisible.textContent = 'true';
        assignment.appendChild(graderCommentsVisible);

        const anonymousGrading = doc.createElement('anonymous_grading');
        anonymousGrading.textContent = 'false';
        assignment.appendChild(anonymousGrading);

        const gradersAnonymous = doc.createElement('graders_anonymous_to_graders');
        gradersAnonymous.textContent = 'false';
        assignment.appendChild(gradersAnonymous);

        const graderNamesVisible = doc.createElement('grader_names_visible_to_final_grader');
        graderNamesVisible.textContent = 'true';
        assignment.appendChild(graderNamesVisible);

        const anonInstructorAnnotations = doc.createElement('anonymous_instructor_annotations');
        anonInstructorAnnotations.textContent = 'false';
        assignment.appendChild(anonInstructorAnnotations);

        const postPolicy = doc.createElement('post_policy');
        assignment.appendChild(postPolicy);

        const postManually = doc.createElement('post_manually');
        postManually.textContent = 'false';
        postPolicy.appendChild(postManually);

        const assignmentGroupId = doc.createElement('assignment_group_identifierref');
        assignmentGroupId.textContent = `g${uuidv4().replace(/-/g, '').substring(0, 31)}`;
        quiz.appendChild(assignmentGroupId);

        const quizOverrides = doc.createElement('assignment_overrides');
        quiz.appendChild(quizOverrides);

        return quiz;
    }

    prettifyXML(elem) {
        const serializer = new XMLSerializer();
        let xmlString = serializer.serializeToString(elem);
        
        // Add XML declaration if not present
        if (!xmlString.startsWith('<?xml')) {
            xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;
        }

        return xmlString;
    }

    async convert(markdownContent, outputFilename = 'qti_export.zip') {
        this.questions = [];
        this.parseMarkdown(markdownContent);

        if (this.questions.length === 0) {
            throw new Error("No questions found in markdown content");
        }

        // Create QTI XML
        const qtiXml = this.createQTIXML();
        const assessmentId = qtiXml.firstChild.getAttribute('ident');
        const qtiContent = this.prettifyXML(qtiXml);

        // Create manifest
        const manifestXml = this.createManifest(assessmentId);
        const manifestContent = this.prettifyXML(manifestXml);

        // Create assessment meta
        const assessmentMetaXml = this.createAssessmentMeta(assessmentId);
        const assessmentMetaContent = this.prettifyXML(assessmentMetaXml);

        // Create zip file with Canvas structure
        const zip = new JSZip();
        
        // Create folder for assessment
        const assessmentFolder = zip.folder(assessmentId);
        assessmentFolder.file(`${assessmentId}.xml`, qtiContent);
        assessmentFolder.file('assessment_meta.xml', assessmentMetaContent);
        
        // Add manifest at root
        zip.file('imsmanifest.xml', manifestContent);
        
        // Create empty non_cc_assessments folder (Canvas requirement)
        zip.folder('non_cc_assessments');

        const zipBlob = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(outputFilename, zipBlob);

        console.log(`✓ Successfully created ${outputFilename}`);
        console.log(`✓ Quiz Title: ${this.quizTitle}`);
        console.log(`✓ Total Questions: ${this.questions.length}`);
        console.log(`✓ Total Points: ${this.questions.reduce((sum, q) => sum + q.points, 0).toFixed(1)}`);
        
        return outputFilename;
    }
}

module.exports = MarkdownToQTI;