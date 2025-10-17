## Comprehensive Markdown to QTI Format Guide

This guide provides detailed instructions for creating quiz content in Markdown format that can be converted to QTI (Question and Test Interoperability) format for use in Canvas, Blackboard, Moodle, and other Learning Management Systems.

---

## Basic Structure

### Quiz Title
Every quiz begins with a title using a single `#` symbol:

```markdown
# Star Wars Knowledge Assessment
```

### Question Format
Each question starts with `##` followed by the question text:

```markdown
## 1. Who is Luke Skywalker's father?
```

**Note:** Question numbering is optional but recommended for organization.

---

## Question Properties

Every question requires two essential properties:

### Type Declaration
Specifies the question format:
```markdown
Type: multiple_choice
```

### Point Value
Assigns the point value for the question:
```markdown
Points: 2
```

### Optional: Custom Title
Override the default question identifier:
```markdown
Title: Skywalker Family Tree - Question 1
```

---

## Answer Syntax

### Correct Answers
Use an asterisk `*` to denote correct answers:
```markdown
* Darth Vader
```

### Incorrect Answers
Use a hyphen `-` to denote incorrect options:
```markdown
- Obi-Wan Kenobi
- Emperor Palpatine
- Yoda
```

---

## Question Types Reference

### 1. Multiple Choice (Single Answer)

Select one correct answer from multiple options.

```markdown
## 1. What is the weapon of a Jedi Knight?
Type: multiple_choice
Points: 1
* Lightsaber
- Blaster
- Bowcaster
- Electrostaff
```

---

### 2. True/False

Binary choice questions requiring a true or false response.

```markdown
## 2. The Death Star was destroyed in A New Hope
Type: true_false
Points: 1
* True
- False
```

---

### 3. Multiple Answers

Questions with multiple correct responses.

```markdown
## 3. Which characters are part of the original trilogy?
Type: multiple_answers
Points: 3
* Luke Skywalker
* Princess Leia
* Han Solo
- Rey
- Kylo Ren
- Finn
```

**Note:** Each correct answer marked with `*` contributes to the total score.

---

### 4. Fill in the Blank

Short answer questions requiring typed responses.

```markdown
## 4. Complete the phrase: "May the [blank] be with you"
Type: fill_in_blank
Points: 1
* Force
```

**Tip:** You can provide multiple acceptable answers:
```markdown
* Force
* force
* FORCE
```

---

### 5. Fill in Multiple Blanks

Questions with multiple fill-in-the-blank responses.

```markdown
## 5. The Rebel Alliance was led by [blank1] while the Empire was commanded by [blank2]
Type: fill_in_multiple_blanks
Points: 2
Blank: blank1 = Princess Leia|Leia Organa|Leia
Blank: blank2 = Emperor Palpatine|Palpatine|The Emperor
```

**Syntax:** Use `|` to separate acceptable answers for each blank.

---


### 6. Matching

Pair items from two columns.

```markdown
## 7. Match each character to their homeworld
Type: matching
Points: 4
Match: Luke Skywalker = Tatooine
Match: Princess Leia = Alderaan
Match: Han Solo = Corellia
Match: Yoda = Dagobah
```

---

### 7. Numerical

Questions requiring numeric answers with optional tolerance.

```markdown
## 8. How many years did Obi-Wan wait on Tatooine before training Luke?
Type: numerical
Points: 2
* 19
Tolerance: 1
```

**Tolerance:** Accepts answers within ±1 of the correct value (18-20 would be accepted).

---

### 8. Essay

Long-form text responses.

```markdown
## 9. Analyze the philosophical differences between the Jedi and Sith orders
Type: essay
Points: 10
```

**Note:** No answer options needed. Students provide extended written responses.

---

### 9. File Upload

Questions requiring file submissions.

```markdown
## 10. Upload your Star Wars character concept art
Type: file_upload
Points: 5
```

---

### 10. Text Only (Informational)

Display information without requiring an answer.

```markdown
## The following questions cover material from Episodes IV, V, and VI of the Star Wars saga. Please ensure you have reviewed these films before proceeding.
Type: text
```

**Usage:** Perfect for instructions, section breaks, or contextual information.

---

### 11. Calculated Questions

Questions with variable values and mathematical formulas.

```markdown
## What is [x] plus [y]?
Type: calculated
Points: 2
Formula: x+y
Tolerance: 1
* 11
* 10
* 12
```

**Note:** Calculated questions use variables that are randomly generated within specified ranges. The formula defines the calculation, and tolerance allows for acceptable answer ranges.

---

## Advanced Features

### Feedback Messages

Provide custom feedback based on student responses.

#### Correct Answer Feedback
```markdown
Feedback_Correct:
Excellent! You understand the Skywalker family lineage.
End_Feedback
```

#### Incorrect Answer Feedback
```markdown
Feedback_Incorrect:
Review the revelation scene in The Empire Strikes Back.
End_Feedback
```

#### General Feedback
```markdown
Feedback_Neutral:
The relationship between Luke and Vader is central to the original trilogy's narrative.
End_Feedback
```

---

## Complete Example Quiz

```markdown
# Star Wars Original Trilogy Assessment

## This assessment covers key events, characters, and themes from Star Wars Episodes IV-VI. You will have 30 minutes to complete all questions.
Type: text

## 1. Who is the main protagonist of the original Star Wars trilogy?
Title: Character Identification - Question 1
Type: multiple_choice
Points: 1
* Luke Skywalker
- Han Solo
- Princess Leia
- Obi-Wan Kenobi
Feedback_Correct:
Correct! Luke Skywalker is the central hero of the original trilogy.
End_Feedback
Feedback_Incorrect:
Review the character arcs in Episodes IV, V, and VI.
End_Feedback

## 2. The Empire Strikes Back is the second film in the original trilogy
Title: Film Sequence - Question 2
Type: true_false
Points: 1
* True
- False

## 3. Which planets appear in the original trilogy?
Title: Planet Recognition - Question 3
Type: multiple_answers
Points: 3
* Tatooine
* Hoth
* Endor
- Coruscant
- Naboo
- Jakku

## 4. The famous quote is "No, I am your [blank]"
Title: Famous Quote - Question 4
Type: fill_in_blank
Points: 1
* father
* Father

## 5. In A New Hope, [blank1] gave [blank2] his lightsaber
Title: Character Relationships - Question 5
Type: fill_in_multiple_blanks
Points: 2
Blank: blank1 = Obi-Wan|Obi-Wan Kenobi|Ben Kenobi
Blank: blank2 = Luke|Luke Skywalker

## 6. Match each character to their role
Title: Character Role Matching - Question 6
Type: matching
Points: 4
Match: Luke Skywalker = Jedi Knight
Match: Princess Leia = Rebel Leader
Match: Darth Vader = Sith Lord
Match: Emperor Palpatine = Empire Leader

## 7. In what year was the first Star Wars film released?
Title: Film History - Question 7
Type: numerical
Points: 1
* 1977
Tolerance: 0

## 8. Discuss the hero's journey as exemplified by Luke Skywalker
Title: Literary Analysis - Question 8
Type: essay
Points: 10

## 9. Upload your analysis document of Force philosophy
Title: Document Submission - Question 9
Type: file_upload
Points: 5

## 10. What is [x] plus [y]?
Title: Mathematical Calculation - Question 10
Type: calculated
Points: 2
Formula: x+y
Tolerance: 1
* 11
* 10
* 12
```

---

## Best Practices

### Formatting Guidelines
- Use consistent spacing between questions
- Always include both `Type:` and `Points:` declarations
- Leave blank lines between questions for readability
- Number questions sequentially for organization
- Use descriptive quiz titles

### Answer Guidelines
- Use `*` for all correct answers
- Use `-` for all incorrect options
- Provide clear, unambiguous answer choices
- For fill-in-blank, include common variations
- Maintain consistent capitalization

### Content Guidelines
- Write clear, concise questions
- Avoid trick questions or ambiguous wording
- Ensure point values reflect question difficulty
- Test your quiz before deployment
- Save your Markdown source for future editing

---

## Troubleshooting Common Issues

### Question Not Appearing
- **Check:** Did you use `##` for the question header?
- **Check:** Is there a blank line before the question?

### Answers Not Recognized
- **Check:** Are you using `*` for correct and `-` for incorrect?
- **Check:** Is each answer on its own line?

### Type Error
- **Check:** Is `Type:` spelled correctly with a capital T?
- **Check:** Is the question type name correct? (e.g., `multiple_choice` not `multiple-choice`)

### Points Not Assigned
- **Check:** Is `Points:` spelled correctly with a capital P?
- **Check:** Did you include a numeric value?

### Blanks Not Working
- **Check:** Are blank identifiers consistent? (`blank1` in text matches `Blank: blank1 = ` in definition)
- **Check:** Are you using `[blank1]` format in the question text?

---

## Question Type Quick Reference

| Type | Code | Use Case |
|------|------|----------|
| Multiple Choice | `multiple_choice` | Single correct answer from options |
| True/False | `true_false` | Binary yes/no questions |
| Multiple Answers | `multiple_answers` | Multiple correct selections |
| Fill in Blank | `fill_in_blank` | Single short answer |
| Multiple Blanks | `fill_in_multiple_blanks` | Multiple short answers |
| Matching | `matching` | Pair matching |
| Numerical | `numerical` | Numeric answers |
| Essay | `essay` | Extended response |
| File Upload | `file_upload` | Document submission |
| Text Only | `text` | Information display |
| Calculated | `calculated` | Variable-based mathematical questions |

---

## Summary

Creating quizzes in Markdown format is straightforward:

1. **Start** with a quiz title using `#`
2. **Create** questions using `##`
3. **Specify** the question `Type:` and `Points:`
4. **Mark** correct answers with `*` and incorrect with `-`
5. **Add** feedback for enhanced learning (optional)
6. **Test** your quiz before sharing

With this guide and the provided examples, you're ready to create professional, engaging assessments for any Learning Management System.

## Important Notes

### Unsupported Question Type

**Multiple dropdowns questions are not supported by this application.** If you require multiple dropdowns questions for your assessment, you will need to create them directly within your Learning Management System after importing the QTI file.