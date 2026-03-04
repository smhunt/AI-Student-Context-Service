#!/usr/bin/env python3
"""
Generate SQL file to insert 50 students with 20 documents each.
Step 1: python3 src/db/gen-seed-50.py
Step 2: psql $DATABASE_URL -f /tmp/seed-50.sql

Creates ~1,000 documents + chunks across grades 9-12 at Medway HS and CECI.
Uses deterministic PRNG for reproducible output.
Tags all data with metadata.generated_50 = true for safe cleanup.
"""
import hashlib
import json
import math
import os

OUT_PATH = '/tmp/seed-50.sql'

# ─── Deterministic PRNG (mulberry32, ported from seed-large.ts) ──────────────

_prng_state = [20260304]  # mutable seed container

def _mulberry32():
    s = _prng_state[0]
    s = (s + 0x6D2B79F5) & 0xFFFFFFFF
    _prng_state[0] = s
    t = ((s ^ (s >> 15)) * (1 | s)) & 0xFFFFFFFF
    t = (t + ((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF) ^ t & 0xFFFFFFFF
    return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

def rng():
    return _mulberry32()

def random_int(lo, hi):
    return lo + int(rng() * (hi - lo + 1))

def pick(arr):
    return arr[int(rng() * len(arr))]

def pick_n(arr, n):
    shuffled = list(arr)
    for i in range(len(shuffled) - 1, 0, -1):
        j = int(rng() * (i + 1))
        shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
    return shuffled[:n]

# ─── SQL helpers ─────────────────────────────────────────────────────────────

def esc(s):
    return str(s).replace("'", "''")

def split_into_chunks(text, chunk_size=500, overlap=50):
    trimmed = text.strip()
    if not trimmed:
        return []
    est_tokens = len(trimmed) // 4 + 1
    if est_tokens <= chunk_size:
        return [{'text': trimmed, 'tokenCount': est_tokens}]
    chunk_chars = chunk_size * 4
    overlap_chars = overlap * 4
    chunks = []
    start = 0
    while start < len(trimmed):
        end = min(start + chunk_chars, len(trimmed))
        if end < len(trimmed):
            search_start = max(end - 200, start + 1)
            last_space = trimmed.rfind(' ', search_start, end)
            last_newline = trimmed.rfind('\n', search_start, end)
            bp = max(last_space, last_newline)
            if bp > search_start:
                end = bp + 1
        ct = trimmed[start:end].strip()
        if ct:
            chunks.append({'text': ct, 'tokenCount': len(ct) // 4 + 1})
        if end >= len(trimmed):
            break
        new_start = end - overlap_chars
        if new_start <= start:
            new_start = end
        start = new_start
    return chunks

# ─── Name pools (from seed-large.ts) ────────────────────────────────────────

FIRST_NAMES = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James',
    'Isabella', 'Benjamin', 'Mia', 'Lucas', 'Charlotte', 'Mason', 'Amelia',
    'Ethan', 'Harper', 'Alexander', 'Evelyn', 'Daniel', 'Abigail', 'Matthew',
    'Emily', 'Aiden', 'Elizabeth', 'Henry', 'Sofia', 'Jackson', 'Ella',
    'Sebastian', 'Victoria', 'Jack', 'Scarlett', 'Owen', 'Madison', 'Dylan',
    'Luna', 'Caleb', 'Chloe', 'Nathan', 'Penelope', 'Ryan', 'Layla',
    'Adrian', 'Riley', 'Nolan', 'Zoey', 'Connor', 'Hannah', 'Cameron',
    'Lily', 'Leo', 'Eleanor', 'Logan', 'Hazel', 'Adam', 'Grace', 'Wyatt',
    'Violet', 'Carter', 'Amelie', 'Gabriel', 'Genevieve', 'Olivier',
    'Camille', 'Antoine', 'Julien', 'Celeste', 'Philippe', 'Madeleine',
    'Etienne', 'Eloise', 'Laurent', 'Simone', 'Maxime', 'Vivienne',
    'Benoit', 'Francois', 'Brigitte', 'Dominique', 'Renaud', 'Colette',
    'Arjun', 'Priya', 'Ravi', 'Ananya', 'Aarav', 'Diya', 'Vihaan', 'Aisha',
    'Rohan', 'Neha', 'Aditya', 'Ishaan', 'Kavya', 'Nikhil', 'Meera',
    'Sanjay', 'Pooja', 'Vikram', 'Anjali', 'Pranav', 'Divya', 'Sahil',
    'Tanvi', 'Harsh', 'Shreya', 'Rishi', 'Nandini', 'Wei', 'Yuki',
    'Sakura', 'Mei', 'Kenji', 'Li', 'Chen', 'Yuna', 'Jae', 'Hana', 'Tao',
    'Jun', 'Rina', 'Kai', 'Yumi', 'Akira', 'Haruto', 'Mio', 'Ren', 'Sora',
    'Jing', 'Zhi', 'Omar', 'Fatima', 'Ali', 'Zahra', 'Hassan', 'Leila',
    'Yusuf', 'Nour', 'Ahmad', 'Maryam', 'Khalid', 'Rania', 'Tariq',
    'Amira', 'Kareem', 'Faris', 'Huda', 'Ibrahim', 'Samira', 'Bilal',
    'Dina', 'Zara', 'Kofi', 'Amara', 'Kwame', 'Nia', 'Chidi', 'Emeka',
    'Zuri', 'Obi', 'Ayana', 'Sekou', 'Imani', 'Tendai', 'Jabari',
    'Oluwole', 'Chiamaka', 'Nkem', 'Abeni',
]

LAST_NAMES = [
    'Smith', 'Williams', 'Brown', 'Jones', 'Wilson', 'Taylor', 'Anderson',
    'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia',
    'Robinson', 'Clark', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young',
    'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill',
    'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Tremblay', 'Gagnon',
    'Roy', 'Cote', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin',
    'Gagne', 'Pelletier', 'Dubois', 'Poirier', 'Girard', 'Bergeron',
    'Leclerc', 'Boucher', 'Lefebvre', 'Fournier', 'Beaulieu', 'Dion',
    'Picard', 'Patel', 'Singh', 'Sharma', 'Kumar', 'Gupta', 'Desai',
    'Shah', 'Agarwal', 'Reddy', 'Nair', 'Joshi', 'Verma', 'Mehta', 'Iyer',
    'Rao', 'Malhotra', 'Chopra', 'Bhatia', 'Kapoor', 'Chen', 'Li', 'Wang',
    'Zhang', 'Liu', 'Yang', 'Kim', 'Nguyen', 'Tanaka', 'Suzuki',
    'Yamamoto', 'Watanabe', 'Park', 'Wu', 'Lin', 'Huang', 'Choi',
    'Nakamura', 'Al-Rashid', 'Hassan', 'Ibrahim', 'Mohammed', 'Khalil',
    'Abbas', 'Nasser', 'Farouk', 'Mansour', 'Khoury', 'Okafor', 'Mensah',
    'Asante', 'Nwosu', 'Diallo', 'Osei', 'Toure', 'Abara', 'Adeyemi',
    'Nkosi', 'Mwangi', 'Kimani',
]

# ─── Ontario course catalog ─────────────────────────────────────────────────

COURSES_BY_GRADE = {
    9: [
        ('MPM1D', 'Principles of Mathematics', 'Mathematics'),
        ('ENG1D', 'English', 'English'),
        ('SNC1D', 'Science', 'Science'),
        ('FSF1D', 'Core French', 'French'),
        ('CGC1D', 'Issues in Canadian Geography', 'Geography'),
        ('PPL1O', 'Healthy Active Living Education', 'Physical Education'),
        ('TIJ1O', 'Exploring Technologies', 'Technology'),
        ('AVI1O', 'Visual Arts', 'Arts'),
    ],
    10: [
        ('MPM2D', 'Principles of Mathematics', 'Mathematics'),
        ('ENG2D', 'English', 'English'),
        ('SNC2D', 'Science', 'Science'),
        ('CHC2D', 'Canadian History Since World War I', 'History'),
        ('GLC2O', 'Career Studies', 'Guidance'),
        ('CHV2O', 'Civics and Citizenship', 'Social Sciences'),
        ('PPL2O', 'Healthy Active Living Education', 'Physical Education'),
        ('AVI2O', 'Visual Arts', 'Arts'),
    ],
    11: [
        ('MCR3U', 'Functions', 'Mathematics'),
        ('ENG3U', 'English', 'English'),
        ('SBI3U', 'Biology', 'Science'),
        ('SCH3U', 'Chemistry', 'Science'),
        ('SPH3U', 'Physics', 'Science'),
        ('FSF3U', 'Core French', 'French'),
        ('ICS3U', 'Introduction to Computer Science', 'Computer Science'),
        ('HSP3U', 'Anthropology, Psychology, and Sociology', 'Social Sciences'),
    ],
    12: [
        ('MHF4U', 'Advanced Functions', 'Mathematics'),
        ('MCV4U', 'Calculus and Vectors', 'Mathematics'),
        ('ENG4U', 'English', 'English'),
        ('SBI4U', 'Biology', 'Science'),
        ('SCH4U', 'Chemistry', 'Science'),
        ('SPH4U', 'Physics', 'Science'),
        ('ICS4U', 'Computer Science', 'Computer Science'),
        ('MDM4U', 'Mathematics of Data Management', 'Mathematics'),
    ],
}

# ─── Teacher data ────────────────────────────────────────────────────────────

TEACHER_DEFS = [
    # (first, last, department, ext_id_suffix)
    ('Margaret', "O'Brien", 'English', '050'),
    ('Robert', 'Patel', 'Science', '051'),
    ('Jean-Pierre', 'Bouchard', 'History', '052'),
    ('Catherine', 'Tremblay', 'French', '053'),
    ('Michael', 'Wong', 'Mathematics', '054'),
    ('Jennifer', 'MacDonald', 'Physical Education', '055'),
    ('Pradeep', 'Sharma', 'Science', '056'),
    ('Laura', 'Mitchell', 'English', '057'),
    ('Kevin', 'Okafor', 'Mathematics', '058'),
    ('Diane', 'Leclerc', 'Guidance', '059'),
]

# Map subjects to teacher last names for report card attribution
SUBJECT_TEACHERS = {
    'Mathematics': ['Chen', 'Wong', 'Okafor'],
    'English': ["O'Brien", 'Mitchell'],
    'Science': ['Patel', 'Sharma'],
    'History': ['Bouchard'],
    'Geography': ['Bouchard'],
    'French': ['Tremblay', 'Leclerc'],
    'Physical Education': ['MacDonald'],
    'Social Sciences': ['Bouchard'],
    'Computer Science': ['Wong', 'Okafor'],
    'Guidance': ['Leclerc'],
    'Arts': ['Mitchell'],
    'Technology': ['MacDonald'],
}

# ─── Comment fragment pools ──────────────────────────────────────────────────

STRENGTH_COMMENTS = {
    'Mathematics': [
        'demonstrates strong algebraic reasoning and problem-solving skills',
        'shows excellent understanding of mathematical concepts and notation',
        'communicates mathematical thinking clearly and logically',
        'applies mathematical concepts effectively to real-world problems',
        'works collaboratively and helps peers understand difficult concepts',
        'shows strong initiative in tackling challenging problems',
    ],
    'English': [
        'is an engaged and thoughtful reader who contributes meaningful insights',
        'demonstrates strong analytical writing skills with a mature voice',
        'shows excellent comprehension of literary themes and techniques',
        'communicates ideas effectively in both written and oral formats',
        'makes thoughtful connections between texts and contemporary issues',
        'demonstrates creativity and originality in creative writing tasks',
    ],
    'Science': [
        'demonstrates strong scientific inquiry skills and genuine curiosity',
        'designs well-controlled experiments and analyzes results systematically',
        'shows excellent understanding of scientific concepts and terminology',
        'excels at connecting scientific principles to real-world applications',
        'writes thorough lab reports with clear data analysis',
        'demonstrates strong safety awareness and responsible lab practices',
    ],
    'History': [
        'approaches historical analysis with genuine interest and critical thinking',
        'demonstrates strong ability to analyze primary and secondary sources',
        'makes insightful connections between historical events and modern issues',
        'participates actively in Socratic seminars with well-supported arguments',
        'shows excellent research skills and use of evidence in essays',
        'demonstrates strong understanding of cause-and-consequence relationships',
    ],
    'French': [
        'demonstrates strong oral communication skills in French',
        'shows consistent improvement in written expression and grammar',
        'participates actively in French conversation activities',
        'demonstrates good comprehension of authentic French texts',
        'shows genuine enthusiasm for French language and culture',
    ],
    'default': [
        'demonstrates consistent effort and engagement in class activities',
        'shows strong organizational skills and meets deadlines reliably',
        'collaborates effectively with peers on group projects',
        'demonstrates growing confidence and self-advocacy skills',
        'shows initiative in seeking help and using available resources',
    ],
}

GROWTH_COMMENTS = {
    'Mathematics': [
        'should focus on showing complete solutions and checking work before submission',
        'would benefit from additional practice with multi-step word problems',
        'should work on computational accuracy under timed conditions',
        'could improve by reviewing key formulas and their applications regularly',
        'should focus on translating word problems into mathematical expressions',
        'would benefit from more careful attention to units and significant figures',
    ],
    'English': [
        'should focus on more careful proofreading and editing of written work',
        'could strengthen essays by including more specific textual evidence',
        'should work on developing more nuanced thesis statements',
        'would benefit from expanding vocabulary usage in formal writing',
        'should focus on varying sentence structure for more effective communication',
        'could improve paragraph transitions to strengthen essay flow',
    ],
    'Science': [
        'should focus on writing more detailed conclusions in lab reports',
        'could improve by including balanced equations in all relevant analyses',
        'should work on connecting experimental data to theoretical predictions',
        'would benefit from more careful attention to significant figures',
        'should focus on thorough pre-lab planning and post-lab reflection',
        'could strengthen analysis by considering multiple sources of error',
    ],
    'History': [
        'should work on developing more nuanced thesis statements in essays',
        'could improve by supporting all claims with specific historical evidence',
        'should focus on considering multiple perspectives in historical analysis',
        'would benefit from more careful citation of primary sources',
        'should work on distinguishing between correlation and causation in analysis',
    ],
    'French': [
        'should focus on verb conjugation accuracy in written work',
        'could improve pronunciation through regular listening practice',
        'should work on expanding vocabulary for more varied expression',
        'would benefit from reading more French texts outside of class',
        'should focus on gender agreement in written compositions',
    ],
    'default': [
        'should focus on time management during assessments',
        'could improve by reviewing work before submission',
        'should work on developing more detailed responses',
        'would benefit from more consistent study habits',
        'should focus on asking questions when concepts are unclear',
    ],
}

# ─── Grade-specific literary/topic references ───────────────────────────────

ENGLISH_TEXTS = {
    9: ('The Outsiders', 'S.E. Hinton'),
    10: ('To Kill a Mockingbird', 'Harper Lee'),
    11: ("The Handmaid's Tale", 'Margaret Atwood'),
    12: ('Hamlet', 'William Shakespeare'),
}

MATH_TOPICS = {
    9: ('Linear Relations Investigation', 'linear equations and graphing'),
    10: ('Quadratic Functions Investigation', 'quadratic equations and parabolas'),
    11: ('Trigonometric Functions Investigation', 'sinusoidal functions and transformations'),
    12: ('Limits and Derivatives Investigation', 'limits, continuity, and rates of change'),
}

SCIENCE_TOPICS = {
    9: ('Ecosystems and Biodiversity Lab', 'ecology and biodiversity'),
    10: ('Chemical Reactions Lab Report', 'types of chemical reactions'),
    11: ('Cell Biology Investigation', 'cellular processes and mitosis'),
    12: ('Molecular Genetics Analysis', 'DNA replication and gene expression'),
}

HISTORY_TOPICS = {
    9: ('Canadian Geography Case Study', 'physical and human geography of Canada'),
    10: ('WWI Primary Source Analysis', 'Canada in World War I'),
    11: ('Social Inequality Research Project', 'anthropological perspectives on society'),
    12: ('Contemporary Social Change Analysis', 'social movements and societal transformation'),
}

# ─── Student distribution ───────────────────────────────────────────────────

# Medway: 7×G9 + 6×G10 + 6×G11 + 6×G12 = 25
# CECI:   6×G9 + 7×G10 + 6×G11 + 6×G12 = 25
STUDENT_DISTRIBUTION = [
    ('MHS', 'Medway High School', [(9, 7), (10, 6), (11, 6), (12, 6)]),
    ('CECI', 'Central Elgin Collegiate Institute', [(9, 6), (10, 7), (11, 6), (12, 6)]),
]

# ─── Data generation ────────────────────────────────────────────────────────

def clean_name(s):
    return ''.join(c for c in s.lower() if c.isalpha())


def generate_students():
    """Generate 50 students across both schools."""
    students = []
    counter = 50
    for school_code, school_name, grade_counts in STUDENT_DISTRIBUTION:
        for grade, count in grade_counts:
            for i in range(count):
                first = pick(FIRST_NAMES)
                last = pick(LAST_NAMES)
                ext_id = f'STU-2025-{counter:03d}'
                oen = str(200000000 + counter)
                homeroom = f'{grade}{chr(65 + (i % 6))}'
                students.append({
                    'first': first,
                    'last': last,
                    'email': f'{clean_name(first)}.{clean_name(last)}{counter}@student.tvdsb.on.ca',
                    'ext_id': ext_id,
                    'grade': grade,
                    'school_code': school_code,
                    'school_name': school_name,
                    'oen': oen,
                    'homeroom': homeroom,
                    'base_mark': random_int(62, 95),
                })
                counter += 1
    return students


def generate_parents(students):
    """Generate 25 parents (1 per 2 students, shared last name)."""
    parents = []
    counter = 50
    for i in range(0, len(students), 2):
        s = students[i]
        first = pick(FIRST_NAMES)
        parents.append({
            'first': first,
            'last': s['last'],
            'email': f'{clean_name(first)}.{clean_name(s["last"])}{counter}@tvdsb.on.ca',
            'ext_id': f'PAR-{counter:03d}',
            'student_indices': [i, i + 1] if i + 1 < len(students) else [i],
        })
        counter += 1
    return parents


def consent_status_for(idx):
    """75% granted, 15% pending, 10% denied."""
    r = rng()
    if r < 0.75:
        return 'granted'
    elif r < 0.90:
        return 'pending'
    return 'denied'


def get_teacher_for_subject(subject, student_idx):
    """Pick a teacher name for a given subject deterministically."""
    teachers = SUBJECT_TEACHERS.get(subject, SUBJECT_TEACHERS.get('default', ['Smith']))
    return teachers[student_idx % len(teachers)]


def pick_courses_for_student(grade):
    """Pick 4 grade-appropriate courses for a student."""
    available = COURSES_BY_GRADE.get(grade, COURSES_BY_GRADE[9])
    return pick_n(available, min(4, len(available)))


def make_mark(base, jitter=8):
    """Generate a mark with jitter, clamped 50-100."""
    return max(50, min(100, base + random_int(-jitter, jitter)))


def achievement_level(mark):
    if mark >= 80: return 'Level 4'
    if mark >= 70: return 'Level 3'
    if mark >= 60: return 'Level 2'
    return 'Level 1'


def learning_skill(mark):
    if mark >= 85: return 'Excellent'
    if mark >= 70: return 'Good'
    return 'Satisfactory'


# ─── Document template generators ───────────────────────────────────────────

def make_report_card(student, course_code, course_name, subject, mark, teacher_name, term_label):
    """Generate a report card document (docs 1-4)."""
    name = f'{student["first"]} {student["last"]}'
    grade = student['grade']
    al = achievement_level(mark)

    k_mark = make_mark(mark, 5)
    t_mark = make_mark(mark, 5)
    c_mark = make_mark(mark, 5)
    a_mark = make_mark(mark, 5)

    strengths = STRENGTH_COMMENTS.get(subject, STRENGTH_COMMENTS['default'])
    growths = GROWTH_COMMENTS.get(subject, GROWTH_COMMENTS['default'])
    s1 = pick(strengths)
    s2 = pick(strengths)
    while s2 == s1:
        s2 = pick(strengths)
    g1 = pick(growths)

    content = f"""Student: {name} | OEN: {student['oen']}
Course: {course_code} - {course_name}, Grade {grade}
Term: {term_label} 2025-2026 | Teacher: {teacher_name} | {student['school_name']}

Achievement Level Summary:
- Knowledge and Understanding: {achievement_level(k_mark)} ({k_mark}%)
- Thinking: {achievement_level(t_mark)} ({t_mark}%)
- Communication: {achievement_level(c_mark)} ({c_mark}%)
- Application: {achievement_level(a_mark)} ({a_mark}%)

Overall Mark: {mark}% ({al})

Teacher Comments:
{name} {s1}. Additionally, {name} {s2}. To continue improving, {name} {g1}.

Learning Skills:
- Responsibility: {learning_skill(mark)}
- Organization: {learning_skill(mark - 3)}
- Independent Work: {learning_skill(mark + 2)}
- Collaboration: {learning_skill(mark)}
- Initiative: {learning_skill(mark - 2)}
- Self-Regulation: {learning_skill(mark - 5)}"""

    return {
        'source': 'sis_report_card',
        'title': f'{course_code} {term_label} 2025 Report Card',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'term': f'{term_label} 2025', 'course_code': course_code, 'generated_50': True}),
    }


def make_assignment(student, subject, grade):
    """Generate a classroom assignment (docs 5-7)."""
    name = f'{student["first"]} {student["last"]}'
    mark = make_mark(student['base_mark'])

    if subject == 'Mathematics':
        title, topic = MATH_TOPICS[grade]
        content = f"""Assignment: {title}
Course: {COURSES_BY_GRADE[grade][0][0]} - {COURSES_BY_GRADE[grade][0][1]}
Date: January 15, 2026
Student: {name}

Task: Investigate key concepts in {topic} and present your findings with worked examples.

{name}'s Submission:
I explored the relationship between {topic} using three different approaches. Through graphical analysis, algebraic manipulation, and real-world application, I demonstrated how these concepts connect to everyday problem-solving.

My investigation showed that understanding {topic} requires both procedural fluency and conceptual understanding. The graphical approach helped me visualize the relationships, while the algebraic method confirmed my observations with precise calculations.

I applied these concepts to a real-world scenario involving rates of change in environmental data, which showed how mathematics connects to fields like environmental science and engineering.

Grade: {mark}% ({achievement_level(mark)})
Feedback: Good investigation showing understanding of {topic}. Your real-world connections strengthen the analysis."""
    elif subject == 'English':
        text_title, author = ENGLISH_TEXTS[grade]
        content = f"""Assignment: Character Analysis Essay - {text_title}
Course: {[c for c in COURSES_BY_GRADE[grade] if c[2] == 'English'][0][0]} - English
Date: November 22, 2025
Student: {name}

Prompt: Choose one character from "{text_title}" by {author} and analyze how the author uses that character to explore a central theme.

{name}'s Essay:
In {author}'s "{text_title}," the protagonist serves as a lens through which the reader examines themes of identity, justice, and moral courage. Through careful character development, {author} demonstrates that personal growth often comes through confrontation with difficult truths.

The character's journey reveals the tension between individual conscience and societal expectations. Key moments in the text show how the protagonist navigates this tension, ultimately arriving at a deeper understanding of their place in the world.

Through literary devices including symbolism, foreshadowing, and dialogue, {author} creates a nuanced portrait that resonates with contemporary readers. The themes explored remain relevant to discussions about social responsibility and ethical decision-making.

Word Count: 284

Grade: {mark}% ({achievement_level(mark)})
Feedback: Thoughtful analysis with good textual connections. Consider adding more specific quotations to strengthen your argument."""
    else:
        # Science or History assignment
        if subject in ('Science', 'Biology', 'Chemistry', 'Physics'):
            title, topic = SCIENCE_TOPICS[grade]
        else:
            title, topic = HISTORY_TOPICS.get(grade, ('Research Analysis', 'interdisciplinary inquiry'))
        content = f"""Assignment: {title}
Course: Grade {grade} {subject}
Date: October 15, 2025
Student: {name}

Task: Conduct a detailed analysis related to {topic}.

{name}'s Analysis:
This investigation examined key aspects of {topic} through both primary research and literature review. The analysis revealed several important findings related to the core concepts studied in class.

Through systematic observation and data collection, I identified patterns that support the theoretical frameworks discussed in our course materials. The evidence gathered demonstrates a clear connection between the concepts studied and their real-world applications.

My conclusions suggest that further investigation into {topic} would be valuable, particularly in understanding how these principles apply to current challenges in the field.

Grade: {mark}% ({achievement_level(mark)})
Feedback: Solid analysis demonstrating understanding of {topic}. To improve, include more specific data and evidence to support your conclusions."""

    return {
        'source': 'google_classroom_assignment',
        'title': title if subject != 'English' else f'{text_title} Character Analysis Essay',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'course_code': COURSES_BY_GRADE[grade][0][0], 'assignment_type': 'investigation', 'generated_50': True}),
    }


def make_submission(student, grade):
    """Generate a lab report / project submission (doc 8)."""
    name = f'{student["first"]} {student["last"]}'
    mark = make_mark(student['base_mark'])
    title, topic = SCIENCE_TOPICS[grade]

    content = f"""Lab Report: {title}
Course: Grade {grade} Science
Date: October 28, 2025
Student: {name}

Purpose:
To investigate and document observations related to {topic} through hands-on experimentation.

Hypothesis:
If we systematically examine {topic}, we will observe patterns consistent with the theoretical models discussed in class.

Materials:
Standard laboratory equipment, safety goggles, lab apron, data collection sheets, and digital measurement tools.

Observations:
The experimental results showed clear patterns that aligned with our predictions. Data was collected across multiple trials to ensure reliability. Key measurements were recorded in a data table with appropriate units and significant figures.

Analysis:
The data supports our hypothesis. Statistical analysis of the results shows a strong correlation between the predicted and observed values. Sources of error include measurement precision and environmental variables.

Conclusion:
Our hypothesis was supported by the experimental evidence. The investigation demonstrated key principles of {topic} and their practical applications.

Grade: {mark}% ({achievement_level(mark)})
Feedback: Thorough lab report with good experimental design. Include more detailed error analysis in future reports."""

    return {
        'source': 'google_classroom_submission',
        'title': f'{title} - Submission',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'assignment_type': 'lab_report', 'generated_50': True}),
    }


def make_grade_record(student, course_code, course_name, subject, grade, idx):
    """Generate a test/quiz grade record (docs 9-10)."""
    name = f'{student["first"]} {student["last"]}'
    mark = make_mark(student['base_mark'])
    teacher_name = get_teacher_for_subject(subject, hash(student['ext_id']) % 100)

    assessment_type = 'Unit Test' if idx == 0 else 'Quiz'
    unit_num = idx + 2

    k_pct = make_mark(mark, 5)
    a_pct = make_mark(mark, 5)
    t_pct = make_mark(mark, 5)
    c_pct = make_mark(mark, 5)

    content = f"""Grade Record: Unit {unit_num} {assessment_type}
Course: {course_code} - {course_name}, Grade {grade}
Date: {'December 5' if idx == 0 else 'November 15'}, 2025
Student: {name}
Teacher: {teacher_name}

Assessment Breakdown:
Section A - Knowledge (20 marks): {int(20 * k_pct / 100)}/20 ({k_pct}%)
Section B - Application (15 marks): {int(15 * a_pct / 100)}/15 ({a_pct}%)
Section C - Thinking (10 marks): {int(10 * t_pct / 100)}/10 ({t_pct}%)
Section D - Communication (5 marks): {int(5 * c_pct / 100)}/5 ({c_pct}%)

Total: {int(50 * mark / 100)}/50 ({mark}%) - {achievement_level(mark)}

Teacher Notes: {name} shows {'solid' if mark >= 70 else 'developing'} understanding of the material covered in this unit. {'Strong communication of reasoning throughout.' if mark >= 75 else 'Should focus on showing more complete solutions.'}"""

    return {
        'source': 'google_classroom_grade',
        'title': f'{course_code} Unit {unit_num} {assessment_type}',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'course_code': course_code, 'assessment_type': assessment_type.lower().replace(' ', '_'), 'generated_50': True}),
    }


def make_comment_thread(student, course_code, subject, grade, idx):
    """Generate a teacher feedback thread (docs 11-12)."""
    name = f'{student["first"]} {student["last"]}'
    teacher_name = get_teacher_for_subject(subject, hash(student['ext_id']) % 100)
    topic = 'homework practice set' if idx == 0 else 'project draft feedback'

    strengths = STRENGTH_COMMENTS.get(subject, STRENGTH_COMMENTS['default'])
    growths = GROWTH_COMMENTS.get(subject, GROWTH_COMMENTS['default'])

    content = f"""Google Classroom Comment Thread
Course: {course_code} - Grade {grade} {subject}
Assignment: {subject} {topic.title()} #{idx + 3}
Date: {'January 22' if idx == 0 else 'February 5'}, 2026

Teacher ({teacher_name}): {name}, good work on this {topic}. You {pick(strengths)}. However, you {pick(growths)}. Please review and resubmit the revised sections.

Student ({name}): Thanks {teacher_name.split()[-1] if ' ' in teacher_name else teacher_name}! I see what you mean. I'll revise the sections you mentioned and pay more attention to those details going forward.

Teacher ({teacher_name}): Great response, {name}. Your willingness to revise shows real maturity. I can see the improvement already in your recent work. Keep it up!"""

    return {
        'source': 'google_classroom_comment',
        'title': f'{course_code} - {topic.title()} Feedback',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'course_code': course_code, 'comment_type': 'teacher_feedback', 'generated_50': True}),
    }


def make_transcript(student):
    """Generate academic transcript (doc 13)."""
    name = f'{student["first"]} {student["last"]}'
    grade = student['grade']
    base = student['base_mark']

    # Previous year courses
    prev_grade = grade - 1 if grade > 9 else 9
    prev_courses = COURSES_BY_GRADE.get(prev_grade, COURSES_BY_GRADE[9])

    lines = [
        'OFFICIAL ACADEMIC TRANSCRIPT',
        'Thames Valley District School Board',
        f'{student["school_name"]}',
        '',
        f'Student: {name} | OEN: {student["oen"]}',
        f'Grade: {grade} | Homeroom: {student["homeroom"]}',
        '',
    ]

    if grade > 9:
        lines.append(f'=== Grade {prev_grade} ({2024 if prev_grade == 9 else 2023}-{2025 if prev_grade == 9 else 2024}) ===')
        lines.append('')
        total = 0
        for code, cname, subj in prev_courses[:4]:
            m = make_mark(base, 6)
            total += m
            lines.append(f'{code} - {cname}, Gr. {prev_grade}    {m}%  Credit: 1.0')
        lines.append('')
        lines.append(f'Grade {prev_grade} Average: {total // 4}%')
        lines.append(f'Credits Earned: 8.0')
        lines.append('')

    lines.append(f'=== Grade {grade} (2025-2026) — In Progress ===')
    lines.append('')
    curr_courses = COURSES_BY_GRADE.get(grade, COURSES_BY_GRADE[9])
    for code, cname, subj in curr_courses[:4]:
        m = make_mark(base, 6)
        lines.append(f'{code} - {cname}, Gr. {grade}    {m}%  Credit: 1.0')
    lines.append('')

    credits = 8 * (grade - 8) if grade > 9 else 4
    lines.append(f'Total Credits Earned: {credits}.0 / 30 required for OSSD')
    hours = random_int(5, 35)
    lines.append(f'Community Service Hours: {hours} / 40 required')
    lines.append(f'Cumulative Average: {base}%')

    content = '\n'.join(lines)

    return {
        'source': 'sis_transcript',
        'title': f'Academic Transcript 2024-2026',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'academic_years': ['2024-2025', '2025-2026'], 'generated_50': True}),
    }


def make_attendance(student):
    """Generate attendance summary (doc 14)."""
    name = f'{student["first"]} {student["last"]}'
    rate = random_int(88, 98)
    total_days = 97
    present = int(total_days * rate / 100)
    absent = total_days - present
    excused = max(0, absent - random_int(0, 2))
    lates = random_int(0, 5)

    content = f"""ATTENDANCE SUMMARY
Student: {name} | OEN: {student['oen']}
School: {student['school_name']} | Grade: {student['grade']}
Period: September 2, 2025 - January 31, 2026

Total Instructional Days: {total_days}
Days Present: {present}
Days Absent: {absent}

Absence Breakdown:
- Excused (Parent/Guardian): {excused} days
- Unexcused: {absent - excused} days
- School-Sanctioned: 0 days

Lates: {lates} occurrences

Attendance Rate: {rate}% (Board target: 90%+)

Course-Specific Concerns: {'None flagged.' if rate >= 90 else 'Attendance rate below board target. Monitoring recommended.'}"""

    return {
        'source': 'sis_attendance',
        'title': 'Attendance Summary Fall 2025',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'term': 'Fall 2025', 'generated_50': True}),
    }


def make_eqao(student):
    """Generate EQAO assessment (doc 15). G10+ have results, G9 shows scheduled."""
    name = f'{student["first"]} {student["last"]}'
    grade = student['grade']

    if grade == 9:
        content = f"""EDUCATION QUALITY AND ACCOUNTABILITY OFFICE (EQAO)
Grade 9 Assessment of Mathematics, 2025-2026

Student: {name} | OEN: {student['oen']}
School: {student['school_name']} | Board: Thames Valley DSB

STATUS: Scheduled for June 2026

This student is currently enrolled in Grade 9 Mathematics and will write the EQAO Grade 9 math assessment in June 2026."""
    else:
        mark = make_mark(student['base_mark'], 6)
        al = achievement_level(mark)
        content = f"""EDUCATION QUALITY AND ACCOUNTABILITY OFFICE (EQAO)
Grade 9 Assessment of Mathematics, 2024-2025

Student: {name} | OEN: {student['oen']}
School: {student['school_name']} | Board: Thames Valley DSB
Assessment Date: June 2025

OVERALL RESULT: {al}

Component Scores:
Number Sense and Algebra: {achievement_level(make_mark(mark, 4))}
Linear Relations: {achievement_level(make_mark(mark, 4))}
Measurement and Geometry: {achievement_level(make_mark(mark, 4))}

Provincial Context:
- Percentage of students at or above provincial standard: 54%
- {name}'s result: {'At or above' if mark >= 70 else 'Below'} provincial standard"""

    return {
        'source': 'assessment_eqao',
        'title': 'EQAO Grade 9 Mathematics Assessment',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'assessment_year': '2024-2025', 'generated_50': True}),
    }


def make_board_assessment(student):
    """Generate TVDSB literacy diagnostic (doc 16)."""
    name = f'{student["first"]} {student["last"]}'
    reading_pct = make_mark(student['base_mark'], 6)
    writing_pct = make_mark(student['base_mark'], 6)
    overall = (reading_pct + writing_pct) // 2

    content = f"""TVDSB MID-YEAR LITERACY DIAGNOSTIC
Grade {student['grade']} - OSSLT Preparation Assessment
Date: January 28, 2026

Student: {name} | OEN: {student['oen']}
School: {student['school_name']}

READING COMPONENT (Score: {int(90 * reading_pct / 100)}/90 - {reading_pct}%)
- Strong comprehension of explicit information
- {'Good' if reading_pct >= 70 else 'Developing'} inference skills with narrative texts

WRITING COMPONENT (Score: {int(80 * writing_pct / 100)}/80 - {writing_pct}%)
- {'Clear thesis and well-organized paragraphs' if writing_pct >= 70 else 'Developing organization and thesis clarity'}
- {'Effective use of supporting evidence' if writing_pct >= 75 else 'Needs more specific evidence and examples'}

OVERALL: {overall}% - PREDICTED OSSLT RESULT: {'PASS' if overall >= 65 else 'AT RISK'}"""

    return {
        'source': 'assessment_board',
        'title': 'TVDSB Mid-Year Literacy Diagnostic',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'assessment_type': 'literacy_diagnostic', 'generated_50': True}),
    }


def make_teacher_note(student, idx):
    """Generate teacher progress note (docs 17-18)."""
    name = f'{student["first"]} {student["last"]}'
    grade = student['grade']
    courses = COURSES_BY_GRADE.get(grade, COURSES_BY_GRADE[9])
    course = courses[idx % len(courses)]
    code, cname, subject = course
    teacher_name = get_teacher_for_subject(subject, hash(student['ext_id']) % 100 + idx)
    mark = make_mark(student['base_mark'])

    strengths = STRENGTH_COMMENTS.get(subject, STRENGTH_COMMENTS['default'])
    growths = GROWTH_COMMENTS.get(subject, GROWTH_COMMENTS['default'])

    content = f"""Teacher Progress Note
Student: {name} | Course: {code} | Date: {'January 30' if idx == 0 else 'February 15'}, 2026
Teacher: {teacher_name}

Subject: {'Mid-year progress check' if idx == 0 else 'Term 2 early observations'}

{name} has {'completed Semester 1' if idx == 0 else 'begun Semester 2'} with a {mark}% overall in {code}.

Key observations:
- {name} {pick(strengths)}.
- {name} {pick(growths)}.
- {'Participates regularly in class and shows genuine engagement with the material.' if mark >= 70 else 'Would benefit from more active participation in class discussions.'}

{'Recommended for additional support through peer tutoring.' if mark < 70 else 'On track for continued success in this course.'}"""

    return {
        'source': 'teacher_note',
        'title': f'{code} Progress Note - {"January" if idx == 0 else "February"} 2026',
        'sensitivity': 'standard',
        'content': content,
        'metadata': json.dumps({'course_code': code, 'teacher': teacher_name, 'generated_50': True}),
    }


def make_guidance_note(student):
    """Generate guidance pathway planning note (doc 19)."""
    name = f'{student["first"]} {student["last"]}'
    grade = student['grade']
    next_grade = min(grade + 1, 12)

    content = f"""GUIDANCE COUNSELLOR NOTE - CONFIDENTIAL
Student: {name} | OEN: {student['oen']} | Grade: {grade}
Counsellor: David Williams
Date: February 10, 2026
Type: Individual Pathway Planning Meeting

Current Standing:
- Credits earned: {(grade - 8) * 8 if grade > 9 else 4} (on track)
- Cumulative average: {student['base_mark']}%
- Community service: {random_int(5, 35)}/40 hours

Grade {next_grade} Course Selection Discussion:
- Discussed academic strengths and areas of interest
- Reviewed post-secondary pathway options
- {'Recommended university preparation courses based on strong academic performance' if student['base_mark'] >= 75 else 'Discussed both college and university pathways to keep options open'}

Follow-up: Book midterm check-in for November 2026."""

    return {
        'source': 'guidance_note',
        'title': f'Grade {grade} Course Selection Meeting',
        'sensitivity': 'sensitive',
        'content': content,
        'metadata': json.dumps({'counsellor': 'David Williams', 'meeting_type': 'pathway_planning', 'generated_50': True}),
    }


def make_iep(student):
    """Generate IEP for ~15% of students; otherwise extra teacher note (doc 20)."""
    if rng() > 0.15:
        # Extra teacher note instead of IEP
        return make_teacher_note(student, 2)

    name = f'{student["first"]} {student["last"]}'
    grade = student['grade']
    processing_pctile = random_int(12, 25)
    reasoning_pctile = random_int(65, 90)

    content = f"""INDIVIDUAL EDUCATION PLAN (IEP)
Thames Valley District School Board
{student['school_name']}

Student: {name} | OEN: {student['oen']}
Grade: {grade}
Date of IEP: September 15, 2025 | Annual Review: June 15, 2026

IPRC Identification: Not formally identified through IPRC
Exceptionality: N/A - Accommodations-only IEP

Reason for IEP:
Assessment indicated processing speed in the low-average range ({processing_pctile}th percentile) while reasoning abilities are in the high-average range ({reasoning_pctile}th percentile). The discrepancy supports the need for accommodations.

ACCOMMODATIONS (apply to all courses):

Assessment Accommodations:
- Extended time: 1.5x time for all tests, quizzes, and examinations
- Access to a quiet space for tests and exams
- Permission to use a calculator where computation is not being evaluated
- Alternative test format available if needed

Instructional Accommodations:
- Preferential seating near the front of the classroom
- Written instructions provided in addition to oral instructions
- Graphic organizers provided for note-taking

GOALS:
1. Develop self-advocacy skills by independently requesting accommodations
2. Develop test-taking strategies to reduce anxiety

Parent/Guardian Consent: Signed September 18, 2025."""

    return {
        'source': 'sis_iep',
        'title': 'Individual Education Plan 2025-2026',
        'sensitivity': 'sensitive',
        'content': content,
        'metadata': json.dumps({'iep_type': 'accommodation', 'review_date': '2026-06-15', 'generated_50': True}),
    }


def generate_documents_for_student(student):
    """Generate all 20 documents for a student."""
    docs = []
    grade = student['grade']
    courses = pick_courses_for_student(grade)
    base = student['base_mark']
    student_idx = hash(student['ext_id']) % 1000

    # Docs 1-4: Report cards for each of 4 courses
    terms = ['Fall', 'Fall', 'Fall', 'Fall']
    for i, (code, cname, subject) in enumerate(courses):
        mark = make_mark(base)
        teacher = get_teacher_for_subject(subject, student_idx + i)
        docs.append(make_report_card(student, code, cname, subject, mark, teacher, terms[i]))

    # Determine subjects for assignment docs
    math_subj = [c for c in courses if c[2] == 'Mathematics']
    eng_subj = [c for c in courses if c[2] == 'English']
    other_subj = [c for c in courses if c[2] not in ('Mathematics', 'English')]

    # Docs 5-7: Assignments (Math, English, History/Science)
    docs.append(make_assignment(student, 'Mathematics', grade))
    docs.append(make_assignment(student, 'English', grade))
    other_topic = pick(['Science', 'History']) if not other_subj else other_subj[0][2]
    docs.append(make_assignment(student, other_topic, grade))

    # Doc 8: Lab submission
    docs.append(make_submission(student, grade))

    # Docs 9-10: Grade records
    primary_course = courses[0]
    docs.append(make_grade_record(student, primary_course[0], primary_course[1], primary_course[2], grade, 0))
    secondary_course = courses[1] if len(courses) > 1 else courses[0]
    docs.append(make_grade_record(student, secondary_course[0], secondary_course[1], secondary_course[2], grade, 1))

    # Docs 11-12: Comment threads
    docs.append(make_comment_thread(student, courses[0][0], courses[0][2], grade, 0))
    docs.append(make_comment_thread(student, courses[1][0] if len(courses) > 1 else courses[0][0], courses[1][2] if len(courses) > 1 else courses[0][2], grade, 1))

    # Doc 13: Transcript
    docs.append(make_transcript(student))

    # Doc 14: Attendance
    docs.append(make_attendance(student))

    # Doc 15: EQAO
    docs.append(make_eqao(student))

    # Doc 16: Board assessment
    docs.append(make_board_assessment(student))

    # Docs 17-18: Teacher notes
    docs.append(make_teacher_note(student, 0))
    docs.append(make_teacher_note(student, 1))

    # Doc 19: Guidance note
    docs.append(make_guidance_note(student))

    # Doc 20: IEP or extra teacher note
    docs.append(make_iep(student))

    return docs


# ─── SQL generation ─────────────────────────────────────────────────────────

def main():
    students = generate_students()
    parents = generate_parents(students)

    print(f'Generated {len(students)} students, {len(parents)} parents')

    # Pre-generate all documents
    all_docs = []
    for s in students:
        sdocs = generate_documents_for_student(s)
        all_docs.append(sdocs)

    total_docs = sum(len(d) for d in all_docs)
    total_chunks = 0
    for sdocs in all_docs:
        for doc in sdocs:
            total_chunks += len(split_into_chunks(doc['content']))

    print(f'Total documents: {total_docs}, estimated chunks: {total_chunks}')

    with open(OUT_PATH, 'w') as out:
        out.write("-- Generated by gen-seed-50.py\n")
        out.write("-- 50 students x 20 documents = ~1,000 documents\n")
        out.write("BEGIN;\n\n")
        out.write("DO $$\n")
        out.write("DECLARE\n")
        out.write("  v_board_id UUID;\n")
        out.write("  v_mhs_id UUID;\n")
        out.write("  v_ceci_id UUID;\n")
        out.write("  v_pw_hash TEXT;\n")
        out.write("  v_sid UUID;\n")
        out.write("  v_pid UUID;\n")
        out.write("  v_did UUID;\n")
        out.write("  v_staff_id UUID;\n")
        out.write("  v_course_id UUID;\n")
        out.write("BEGIN\n\n")

        # Look up existing data
        out.write("  -- Look up board, schools, password hash from existing seed data\n")
        out.write("  SELECT id INTO v_board_id FROM boards WHERE slug = 'tvdsb';\n")
        out.write("  IF v_board_id IS NULL THEN\n")
        out.write("    RAISE EXCEPTION 'Board tvdsb not found. Run npm run db:seed first.';\n")
        out.write("  END IF;\n\n")

        out.write("  SELECT id INTO v_mhs_id FROM schools WHERE board_id = v_board_id AND school_code = 'MHS';\n")
        out.write("  SELECT id INTO v_ceci_id FROM schools WHERE board_id = v_board_id AND school_code = 'CECI';\n")
        out.write("  IF v_mhs_id IS NULL OR v_ceci_id IS NULL THEN\n")
        out.write("    RAISE EXCEPTION 'Schools MHS/CECI not found. Run npm run db:seed first.';\n")
        out.write("  END IF;\n\n")

        out.write("  SELECT password_hash INTO v_pw_hash FROM users WHERE email = 'alex.johnson@tvdsb.on.ca';\n")
        out.write("  IF v_pw_hash IS NULL THEN\n")
        out.write("    RAISE EXCEPTION 'Alex Johnson not found. Run npm run db:seed first.';\n")
        out.write("  END IF;\n\n")

        # Cleanup previous seed-50 data
        out.write("  -- Cleanup previous seed-50 data\n")
        out.write("  RAISE NOTICE 'Cleaning up previous seed-50 data...';\n")
        out.write("  DELETE FROM chunks WHERE document_id IN (SELECT id FROM documents WHERE metadata->>'generated_50' = 'true');\n")
        out.write("  DELETE FROM documents WHERE metadata->>'generated_50' = 'true';\n")
        out.write("  DELETE FROM consent_records WHERE notes = 'seed-50-generated';\n")
        out.write("  DELETE FROM course_memberships WHERE user_id IN (SELECT id FROM users WHERE metadata->>'generated_50' = 'true');\n")
        out.write("  DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM users WHERE metadata->>'generated_50' = 'true');\n")
        out.write("  DELETE FROM staff_assignments WHERE staff_id IN (SELECT id FROM users WHERE metadata->>'generated_50' = 'true');\n")
        out.write("  DELETE FROM users WHERE metadata->>'generated_50' = 'true';\n")
        out.write("  RAISE NOTICE 'Cleanup complete.';\n\n")

        # Insert staff (10 teachers)
        out.write("  -- ═══ Staff (10 additional teachers) ═══\n")
        for t in TEACHER_DEFS:
            first, last, dept, ext_suffix = t
            ext_id = f'STAFF-{ext_suffix}'
            email = f'{clean_name(first)}.{clean_name(last)}@tvdsb.on.ca'
            meta = json.dumps({'generated_50': True, 'department': dept})
            out.write(f"  INSERT INTO users (board_id, email, password_hash, name_first, name_last, role, external_id, metadata)\n")
            out.write(f"  VALUES (v_board_id, '{esc(email)}', v_pw_hash, '{esc(first)}', '{esc(last)}', 'teacher', '{esc(ext_id)}', '{esc(meta)}')\n")
            out.write(f"  ON CONFLICT (board_id, external_id) DO UPDATE SET\n")
            out.write(f"    email = EXCLUDED.email, name_first = EXCLUDED.name_first, name_last = EXCLUDED.name_last,\n")
            out.write(f"    metadata = EXCLUDED.metadata\n")
            out.write(f"  RETURNING id INTO v_staff_id;\n")
            # Assign to both schools
            out.write(f"  INSERT INTO staff_assignments (staff_id, school_id, academic_year, department, role_scope)\n")
            out.write(f"  VALUES (v_staff_id, v_mhs_id, '2025-2026', '{esc(dept)}', 'teacher')\n")
            out.write(f"  ON CONFLICT DO NOTHING;\n")
            out.write(f"  INSERT INTO staff_assignments (staff_id, school_id, academic_year, department, role_scope)\n")
            out.write(f"  VALUES (v_staff_id, v_ceci_id, '2025-2026', '{esc(dept)}', 'teacher')\n")
            out.write(f"  ON CONFLICT DO NOTHING;\n\n")

        # Insert courses (ON CONFLICT DO NOTHING)
        out.write("  -- ═══ Courses (~80 courses across grades 9-12 at both schools) ═══\n")
        for grade, course_list in COURSES_BY_GRADE.items():
            for code, cname, subject in course_list:
                semester = 'S1' if hash(code) % 2 == 0 else 'S2'
                full_name = f'{code} - {cname}'
                meta = json.dumps({'generated_50': True})
                for school_var in ['v_mhs_id', 'v_ceci_id']:
                    out.write(f"  INSERT INTO courses (school_id, name, course_code, grade, subject, academic_year, semester, source, metadata)\n")
                    out.write(f"  VALUES ({school_var}, '{esc(full_name)}', '{esc(code)}', {grade}, '{esc(subject)}', '2025-2026', '{semester}', 'sis_sync', '{esc(meta)}')\n")
                    out.write(f"  ON CONFLICT DO NOTHING;\n")
            out.write("\n")

        # Insert 50 students
        out.write("  -- ═══ 50 Students ═══\n")
        for si, s in enumerate(students):
            school_var = 'v_mhs_id' if s['school_code'] == 'MHS' else 'v_ceci_id'
            meta = json.dumps({
                'generated_50': True,
                'grade': s['grade'],
                'homeroom': s['homeroom'],
                'oen': s['oen'],
            })

            out.write(f"\n  -- Student {si + 1}: {s['first']} {s['last']} (Grade {s['grade']}, {s['school_code']})\n")
            out.write(f"  INSERT INTO users (board_id, email, password_hash, name_first, name_last, role, external_id, metadata)\n")
            out.write(f"  VALUES (v_board_id, '{esc(s['email'])}', v_pw_hash, '{esc(s['first'])}', '{esc(s['last'])}', 'student', '{esc(s['ext_id'])}', '{esc(meta)}')\n")
            out.write(f"  ON CONFLICT (board_id, external_id) DO UPDATE SET\n")
            out.write(f"    email = EXCLUDED.email, name_first = EXCLUDED.name_first, name_last = EXCLUDED.name_last,\n")
            out.write(f"    metadata = EXCLUDED.metadata\n")
            out.write(f"  RETURNING id INTO v_sid;\n\n")

            # Enrollment
            out.write(f"  INSERT INTO student_enrollments (student_id, school_id, grade, academic_year, status, start_date)\n")
            out.write(f"  VALUES (v_sid, {school_var}, {s['grade']}, '2025-2026', 'active', '2025-09-02')\n")
            out.write(f"  ON CONFLICT DO NOTHING;\n\n")

            # Course memberships (4 courses per student)
            courses = pick_courses_for_student(s['grade'])
            for code, cname, subject in courses:
                out.write(f"  SELECT id INTO v_course_id FROM courses WHERE school_id = {school_var} AND course_code = '{esc(code)}' AND academic_year = '2025-2026' LIMIT 1;\n")
                out.write(f"  IF v_course_id IS NOT NULL THEN\n")
                out.write(f"    INSERT INTO course_memberships (course_id, user_id, role) VALUES (v_course_id, v_sid, 'student') ON CONFLICT (course_id, user_id) DO NOTHING;\n")
                out.write(f"  END IF;\n")
            out.write("\n")

            # Documents (20 per student)
            docs = all_docs[si]
            for di, doc in enumerate(docs):
                content_hash = hashlib.sha256(doc['content'].encode()).hexdigest()
                chunks = split_into_chunks(doc['content'])

                out.write(f"  -- Doc {di + 1}: {doc['title'][:60]}\n")
                out.write(f"  IF NOT EXISTS (SELECT 1 FROM documents WHERE hash = '{content_hash}') THEN\n")
                out.write(f"    INSERT INTO documents (student_id, board_id, source, title, content, academic_year, sensitivity, metadata, hash)\n")
                out.write(f"    VALUES (v_sid, v_board_id, '{doc['source']}', '{esc(doc['title'])}', '{esc(doc['content'])}', '2025-2026', '{doc['sensitivity']}', '{esc(doc['metadata'])}', '{content_hash}')\n")
                out.write(f"    RETURNING id INTO v_did;\n")

                for ci, chunk in enumerate(chunks):
                    out.write(f"    INSERT INTO chunks (document_id, student_id, board_id, content, chunk_index, token_count, sensitivity, metadata)\n")
                    out.write(f"    VALUES (v_did, v_sid, v_board_id, '{esc(chunk['text'])}', {ci}, {chunk['tokenCount']}, '{doc['sensitivity']}', '{{}}');\n")

                out.write(f"  END IF;\n")
            out.write("\n")

        # Insert parents and consent records
        out.write("  -- ═══ Parents (25) and Consent Records (50) ═══\n")
        consent_sources = "'{google_classroom_assignment,google_classroom_submission,google_classroom_grade,google_classroom_comment,sis_report_card,sis_transcript,sis_attendance,sis_iep,assessment_eqao,assessment_board,teacher_note,guidance_note}'"
        for pi, p in enumerate(parents):
            meta = json.dumps({'generated_50': True})
            out.write(f"\n  -- Parent {pi + 1}: {p['first']} {p['last']}\n")
            out.write(f"  INSERT INTO users (board_id, email, password_hash, name_first, name_last, role, external_id, metadata)\n")
            out.write(f"  VALUES (v_board_id, '{esc(p['email'])}', v_pw_hash, '{esc(p['first'])}', '{esc(p['last'])}', 'parent', '{esc(p['ext_id'])}', '{esc(meta)}')\n")
            out.write(f"  ON CONFLICT (board_id, external_id) DO UPDATE SET\n")
            out.write(f"    email = EXCLUDED.email, name_first = EXCLUDED.name_first, name_last = EXCLUDED.name_last,\n")
            out.write(f"    metadata = EXCLUDED.metadata\n")
            out.write(f"  RETURNING id INTO v_pid;\n\n")

            # Consent records for this parent's students
            for si in p['student_indices']:
                s = students[si]
                status = consent_status_for(si)
                granted_at = "NOW()" if status == 'granted' else "NULL"
                out.write(f"  -- Consent for {s['first']} {s['last']} ({status})\n")
                out.write(f"  SELECT id INTO v_sid FROM users WHERE board_id = v_board_id AND external_id = '{esc(s['ext_id'])}';\n")
                out.write(f"  INSERT INTO consent_records (student_id, parent_id, board_id, consent_type, status, data_sources, granted_at, notes)\n")
                out.write(f"  VALUES (v_sid, v_pid, v_board_id, 'ai_context', '{status}', {consent_sources}, {granted_at}, 'seed-50-generated');\n")
            out.write("\n")

        out.write("  RAISE NOTICE 'seed-50 complete: %s students, %s documents', " + str(len(students)) + ", " + str(total_docs) + ";\n\n")
        out.write("END $$;\n\n")
        out.write("COMMIT;\n")

    size = os.path.getsize(OUT_PATH)
    print(f'Generated {OUT_PATH} ({size:,} bytes)')
    print(f'{len(students)} students, {total_docs} documents, {total_chunks} chunks')


if __name__ == '__main__':
    main()
