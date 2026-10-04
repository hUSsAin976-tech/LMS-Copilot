"""
Seeds rich, accessible course materials for all active courses and indexes them into RAG.
Provides complete lecture notes, slides, lab guides, and reading packs.
"""
from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.models.all import Course, Material, User
from app.rag.service import rag_service

def seed_materials():
    db = SessionLocal()
    user = db.query(User).filter(User.id == 2).first() or db.query(User).order_by(User.id.desc()).first()
    if not user:
        print("No user found")
        return

    courses = db.query(Course).filter(Course.user_id == user.id).all()
    course_by_code = {c.code.upper().strip(): c for c in courses}

    materials_data = [
        # AI312 - Knowledge Representation and Reasoning
        ("AI312", "Module 1: Foundations of Knowledge Bases & Propositional Logic", "pdf", """# AI312: Knowledge Representation and Reasoning
## Module 1: Foundations of Knowledge Bases & Propositional Logic
**Instructor:** Dr. Ayesha Shakeel | Semester 5

### 1. The Knowledge-Based Agent Architecture
A knowledge-based agent uses a knowledge base (KB) representing facts and beliefs about the world.
The central engine executes two fundamental operations:
1. **TELL**: Asserts a new sentence $\\alpha$ to the KB ($KB \\leftarrow KB \\land \\alpha$).
2. **ASK**: Queries whether a candidate query $\\alpha$ logically follows from the current assertions ($KB \\models \\alpha$).

### 2. Syntax and Semantics of Propositional Logic
- **Atomic Propositions**: Boolean symbols $P, Q, R$.
- **Connectives**:
  - Negation: $\\neg P$ (NOT)
  - Conjunction: $P \\land Q$ (AND)
  - Disjunction: $P \\lor Q$ (OR)
  - Implication: $P \\implies Q \\equiv \\neg P \\lor Q$
  - Biconditional: $P \\iff Q \\equiv (P \\implies Q) \\land (Q \\implies P)$

### 3. Truth Table Enumeration Algorithm
To determine whether $KB \\models \\alpha$, we check all $2^n$ interpretations:
- If every row where $KB = \\text{True}$ also has $\\alpha = \\text{True}$, then entailment holds.
- Time Complexity: $O(2^n)$ where $n$ is the number of distinct propositional variables.
- Space Complexity: $O(n)$ recursive depth.

### 4. Resolution Refutation & Conjunctive Normal Form (CNF)
Any propositional formula can be transformed into CNF (conjunction of disjunctive clauses):
1. Eliminate $\\iff$ and $\\implies$.
2. Push $\\neg$ inward using De Morgan's laws:
   $$\\neg(A \\land B) \\equiv \\neg A \\lor \\neg B$$
   $$\\neg(A \\lor B) \\equiv \\neg A \\land \\neg B$$
3. Distribute $\\lor$ over $\\land$:
   $$A \\lor (B \\land C) \\equiv (A \\lor B) \\land (A \\lor C)$$
4. Apply the Unit Resolution and General Resolution rules:
   $$\\frac{l_1 \\lor \\dots \\lor l_k, \\quad \\neg l_1 \\lor m_1 \\lor \\dots \\lor m_j}{l_2 \\lor \\dots \\lor l_k \\lor m_1 \\lor \\dots \\lor m_j}$$
If resolving clauses yields the empty clause $\\square$, then $KB \\land \\neg \\alpha$ is unsatisfiable, proving $KB \\models \\alpha$."""),

        # AI312L - Knowledge Representation Lab
        ("AI312L", "Lab Manual 02: Propositional Logic Theorem Prover in Python", "pdf", """# AI312L: Knowledge Representation and Reasoning Lab
## Lab Manual 02: Building a Propositional Logic Theorem Prover
**Instructor:** Dr. Ayesha Shakeel | Lab Tasks & Code Templates

### Overview & Objectives
In this laboratory session, students implement:
1. A recursive Abstract Syntax Tree (AST) evaluator for propositional formulas.
2. A truth-table generator enumerating all satisfying interpretations.
3. An automated resolution-based refutation theorem prover.

### Core Implementation Guidelines
```python
class PropositionalEvaluator:
    def __init__(self, formula_str):
        self.raw = formula_str

    def evaluate(self, model: dict) -> bool:
        # Evaluates boolean formula under variable assignment dictionary
        # e.g., {'P': True, 'Q': False, 'R': True}
        pass

    def generate_truth_table(self, variables: list) -> list:
        # Returns list of rows with subexpression outputs
        pass
```

### Lab Assessment Criteria
- Correct truth table generation: 40%
- Handling operator precedence (NOT > AND > OR > IMPLIES): 30%
- Wumpus World deduction test case: 30%"""),

        # AI324 - Natural Language Processing
        ("AI324", "Lecture 03 & 04: Word Vector Spaces, Skip-Gram & Word2Vec", "pdf", """# AI324: Natural Language Processing
## Lecture 03 & 04: Word Vector Representations & Continuous Semantics
**Instructor:** Dr. Muhammad Farooq | Semester 5

### 1. The Vector Space Paradigm in NLP
Traditional discrete symbolic representations treat words as independent atomic symbols.
In a vocabulary $|V| = 50,000$, one-hot vectors satisfy:
$$w_i^T w_j = 0 \\quad \\forall i \\neq j$$
This fails to capture semantic proximity between synonymous terms such as *hotel* and *motel*.

### 2. Distributed Representations & Word2Vec
Distributed representations assign every word $w$ a dense, low-dimensional continuous vector $v_w \\in \\mathbb{R}^d$ (typically $d \\in [100, 300]$).
Similar words occupy adjacent positions in Euclidean space and exhibit high cosine similarity:
$$\\text{cosine}(u, v) = \\frac{u \\cdot v}{\\|u\\| \\|v\\|}$$

### 3. Word2Vec Objective Functions
#### Continuous Bag of Words (CBOW)
Predicts center word $w_t$ given context words $w_{t-c}, \\dots, w_{t+c}$:
$$\\mathcal{L}_{CBOW} = \\sum_{t=1}^T \\log P(w_t \\mid w_{t-c}, \\dots, w_{t+c})$$

#### Skip-Gram with Negative Sampling (SGNS)
Predicts context words given center word $w_t$. With $k$ negative samples:
$$\\mathcal{L}_{SGNS} = \\log \\sigma(v'_{w_O}{^T} v_{w_I}) + \\sum_{i=1}^k \\mathbb{E}_{w_i \\sim P_n(w)} [\\log \\sigma(-v'_{w_i}{^T} v_{w_I})]$$

### 4. Vector Arithmetic & Semantic Offsets
Dense vectors capture morphological and semantic relations via linear offsets:
$$\\vec{v}_{\\text{King}} - \\vec{v}_{\\text{Man}} + \\vec{v}_{\\text{Woman}} \\approx \\vec{v}_{\\text{Queen}}$$"""),

        # AI324L - Natural Language Processing Lab
        ("AI324L", "Lab Manual 02: Text Preprocessing, BPE Tokenization & Embedding Training", "pdf", """# AI324L: Natural Language Processing Lab
## Lab Manual 02: Word2Vec Training & Text Tokenization Pipeline
**Instructor:** Dr. Muhammad Farooq | Semester 5

### Objectives
1. Implement regular expression-based text cleaning and Urdu/English tokenization.
2. Train a Skip-Gram Word2Vec model on news articles using PyTorch and Gensim.
3. Compute cosine similarities and plot 2D t-SNE projections of word clusters.

### Deliverables
- Clean Python script `word2vec_training.py`
- Visual plot showing semantic word clusters
- 2-page evaluation report analyzing cosine similarity accuracy"""),

        # AI335 - Deep Learning
        ("AI335", "Lecture 04: Convolutional Neural Networks & Optimization", "pdf", """# AI335: Deep Learning
## Lecture 04: Convolutional Neural Networks, Backpropagation & Adaptive Optimizers
**Instructor:** Dr. Zeeshan Ali | Semester 5

### 1. Spatial Inductive Biases in CNNs
Fully connected networks disregard 2D image topology and suffer from parameter explosion.
CNNs impose three foundational inductive priors:
1. **Local Connectivity**: Each receptive field neuron connects only to a localized $K \\times K$ patch.
2. **Weight Sharing**: A single kernel filter slides across the entire spatial grid, ensuring shift invariance.
3. **Pooling / Striding**: Downsamples feature maps, providing translational tolerance.

### 2. Forward Convolution Dimensions
Given input width $W$, kernel size $K$, padding $P$, and stride $S$:
$$W_{\\text{out}} = \\left\\lfloor \\frac{W - K + 2P}{S} \\right\\rfloor + 1$$

### 3. Adaptive Optimization: Adam (Adaptive Moment Estimation)
Adam combines momentum and RMSprop gradient scaling:
$$m_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t$$
$$v_t = \\beta_2 v_{t-1} + (1 - \\beta_2) g_t^2$$
$$\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}$$
$$\\theta_t = \\theta_{t-1} - \\frac{\\alpha}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t$$
Default hyperparameters: $\\alpha = 0.001$, $\\beta_1 = 0.9$, $\\beta_2 = 0.999$, $\\epsilon = 10^{-8}$."""),

        # AI335L - Deep Learning Lab
        ("AI335L", "Lab Manual 02: L-Layer Neural Network from Scratch in NumPy", "pdf", """# AI335L: Deep Learning Lab
## Lab Manual 02: Vectorized Backpropagation & Deep Neural Network from Scratch
**Instructor:** Dr. Zeeshan Ali | Lab Assignment Brief

### Requirements
1. Implement vectorized Forward Propagation for $L$ dense layers.
2. Compute Cross-Entropy Loss with numerical stability clipping.
3. Implement vectorized analytical Backpropagation:
   $$dZ^{[l]} = dA^{[l]} * g'(Z^{[l]})$$
   $$dW^{[l]} = \\frac{1}{m} dZ^{[l]} (A^{[l-1]})^T$$
   $$db^{[l]} = \\frac{1}{m} \\sum_{i=1}^m dZ^{[l](i)}$$
   $$dA^{[l-1]} = (W^{[l]})^T dZ^{[l]}$$
4. Train on the binary classification dataset and produce convergence curves."""),

        # CS325 - Operating Systems
        ("CS325", "Lecture 05: CPU Scheduling, Virtual Memory & Concurrency", "pdf", """# CS325: Operating Systems
## Lecture 05: CPU Scheduling Algorithms & Paging Architecture
**Instructor:** Dr. Tariq Mehmood | Semester 5

### 1. Preemptive vs. Non-Preemptive CPU Scheduling
- **FCFS (First-Come First-Served)**: Suffers from the Convoy Effect.
- **SJF (Shortest Job First)**: Optimal minimum average waiting time. Preemptive variant is Shortest Remaining Time First (SRTF).
- **Round Robin (RR)**: Time quantum $q$. Balances response time for interactive processes.
- **Multilevel Feedback Queue (MLFQ)**: Dynamically adjusts process priorities based on CPU burst history.

### 2. Synchronization & Critical Section Problem
To prevent race conditions, solutions must guarantee:
1. **Mutual Exclusion**: At most one process executes inside the critical section.
2. **Progress**: Selection of next entering process cannot be delayed indefinitely.
3. **Bounded Waiting**: Bound on how many times other processes can enter before a waiting process is granted access.

### 3. Paging & TLB Operation
Virtual addresses are split into Page Number ($p$) and Offset ($d$).
The Translation Lookaside Buffer (TLB) acts as a high-speed associative cache:
$$\\text{Effective Access Time (EAT)} = h(T_{\\text{TLB}} + T_{\\text{RAM}}) + (1 - h)(T_{\\text{TLB}} + 2 \\cdot T_{\\text{RAM}})$$"""),

        # CS325L - Operating Systems Lab
        ("CS325L", "Lab Manual 02: POSIX Multithreading, Mutexes & Semaphores in C", "pdf", """# CS325L: Operating Systems Lab
## Lab Manual 02: Concurrent Programming with POSIX Threads and Mutexes
**Instructor:** Dr. Tariq Mehmood | Semester 5

### Topics Covered
1. Thread creation and joining via `pthread_create()` and `pthread_join()`.
2. Mutual exclusion using `pthread_mutex_t` and `pthread_mutex_lock()`.
3. Semaphore synchronization using `sem_init()`, `sem_wait()`, and `sem_post()`.
4. Solving the Classic Producer-Consumer bounded-buffer problem."""),

        # CS332 - Design and Analysis of Algorithms
        ("CS332", "Lecture 06: Divide-and-Conquer, Master Theorem & Dynamic Programming", "pdf", """# CS332: Design and Analysis of Algorithms
## Lecture 06: Asymptotic Analysis, Recurrences & Dynamic Programming
**Instructor:** Dr. Usman Tariq | Semester 5

### 1. Asymptotic Notations
- Big-O: $f(n) \\in O(g(n)) \\iff \\exists c > 0, n_0: f(n) \\le c g(n) \\; \\forall n \\ge n_0$
- Big-$\\Omega$: Lower asymptotic bound.
- Big-$\\Theta$: Asymptotically tight bound ($f(n) \\in O(g(n))$ and $f(n) \\in \\Omega(g(n))$).

### 2. Master Theorem for Divide-and-Conquer Recurrences
For $T(n) = a T(n/b) + f(n)$ where $a \\ge 1, b > 1$:
- **Case 1**: If $f(n) = O(n^{\\log_b a - \\epsilon})$, then $T(n) = \\Theta(n^{\\log_b a})$.
- **Case 2**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.
- **Case 3**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ and regularity holds, then $T(n) = \\Theta(f(n))$.

### 3. Dynamic Programming
Optimal Substructure and Overlapping Subproblems:
- 0/1 Knapsack Problem: $O(n W)$ pseudo-polynomial time.
- Longest Common Subsequence (LCS): $O(m n)$ time.
- Bellman-Ford Single-Source Shortest Paths: $O(V \\cdot E)$ time."""),

        # EL271 - Expository Writing
        ("EL271", "Course Reader: Academic Research Writing & Scholarly Arguments", "pdf", """# EL271: Expository Writing
## Course Reader: Principles of Scholarly Arguments & Literature Review
**Instructor:** Ms. Huma Zafar | Semester 5

### 1. Structure of an Academic Research Paper
- **Abstract**: Concise 200-word summary of research question, methodology, and core findings.
- **Introduction**: Problem formulation, research gap, and thesis statement.
- **Literature Review**: Synthesis of scholarly literature categorized thematically rather than chronologically.
- **Methodology & Results**: Transparent, reproducible documentation of experimental apparatus.
- **Discussion & Implications**: Critical analysis of findings against prior research.

### 2. Avoiding Plagiarism & Citation Standards
- Proper integration of direct quotations, paraphrases, and summaries.
- Adherence to IEEE and APA 7th edition referencing styles."""),
    ]

    added = 0
    for c_code, title, m_type, content in materials_data:
        course = course_by_code.get(c_code)
        if not course:
            continue

        existing = db.query(Material).filter(Material.course_id == course.id, Material.title == title).first()
        if not existing:
            m = Material(
                course_id=course.id,
                external_id=f"mat_{c_code.lower()}_{abs(hash(title)) % 100000}",
                title=title,
                type=m_type,
                source_url=f"https://ams.niit.edu.pk/courses/{c_code.lower()}/materials/{abs(hash(title)) % 9000 + 1000}",
                content_text=content,
                indexed_at=datetime.now(timezone.utc),
            )
            db.add(m)
            db.flush()
            added += 1

            # Ingest into RAG
            try:
                rag_service.ingest_document(
                    material_id=str(m.id),
                    course_id=str(course.id),
                    user_id=user.id,
                    title=m.title,
                    text=content,
                    course_code=course.code,
                )
            except Exception as e:
                print(f"RAG ingest warning for {m.title}: {e}")

    db.commit()
    db.close()
    print(f"Successfully seeded {added} comprehensive course materials and indexed into RAG!")

if __name__ == "__main__":
    seed_materials()
