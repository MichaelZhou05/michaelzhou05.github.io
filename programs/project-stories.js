const asset = name => new URL(`../assets/programs/projects/${name}`, import.meta.url).href;

function screenshot(file, width, height, alt, caption, { priority = false, callouts = [] } = {}) {
  return `<figure class="project-figure">
    <a class="project-image" href="${asset(file)}" target="_blank" rel="noopener noreferrer"
      aria-label="Open full-size image. ${alt}">
      <img src="${asset(file)}" width="${width}" height="${height}" alt="${alt}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'}>
      ${callouts.map((item, index) => `<span class="project-pin" style="--pin-x:${item.x}%;--pin-y:${item.y}%" aria-hidden="true">${index + 1}</span>`).join('')}
    </a>
    ${callouts.length ? `<ol class="project-key">${callouts.map(item => `<li><strong>${item.title}</strong><span>${item.text}</span></li>`).join('')}</ol>` : ''}
    <figcaption>${caption}</figcaption>
  </figure>`;
}

function flow(title, steps, caption) {
  return `<figure class="project-flow">
    <strong class="project-flow-title">${title}</strong>
    <ol>${steps.map(([label, description]) => `<li><strong>${label}</strong><span>${description}</span></li>`).join('')}</ol>
    <figcaption>${caption}</figcaption>
  </figure>`;
}

const playground = {
  id: 'playground',
  name: 'Playground AI',
  tab: 'Playground',
  subtitle: 'A study workspace built around course materials',
  intro: 'Open a Canvas lecture, point to a confusing diagram, and ask about it beside the original PDF. Playground retrieves relevant passages from the course to ground its answers. Explorer chat links those answers back to the source files. An interactive concept map gives students another way to find what to read next.',
  videoId: '1ns7t31nPWY',
  hero: screenshot('playground-workspace.webp', 1440, 820,
    'Playground Workspace showing an RC charging curve in the Sources panel and a worked explanation in the Chat panel.',
    'The current Workspace, captured locally with sample course files and a scripted answer. Select the image to enlarge.', {
      priority: true,
      callouts: [
        { x: 11, y: 15, title: 'Find a source', text: 'Search the course library or filter files by type or topic.' },
        { x: 47, y: 42, title: 'Read in place', text: 'Open the PDF, annotate it, or select part of a page for chat.' },
        { x: 96, y: 32, title: 'Ask a question', text: 'See the explanation stream into Chat beside the PDF.' },
      ],
    }),
  role: 'I worked on citation-backed answers, the course knowledge graph, and a K-means analysis module that groups related student questions. Duke OIT procured the Canvas app, as reported in my résumé.',
  sections: [
    {
      id: 'workspace', title: 'Inside the Workspace', nav: 'Workspace',
      body: `<p>A student looking at an RC charging curve can open the lecture from Sources, select the part of the plot they’re stuck on, and ask why the voltage reaches 63% after one time constant. The PDF stays in view while the answer streams into Chat.</p>
        ${screenshot('playground-selection.webp', 1440, 820,
          'The Workspace PDF selection tool outlining the RC curve, with a question about the selected region ready to send.',
          'A student can select a figure in the PDF and send it with a question. Captured with a sample lecture.')}
        <p>PDF.js renders the pages in the browser. The selection tool crops a region of the page into an image and sends it with the filename and page number. A student can also attach a separate image, such as a photo of a handwritten circuit. The filename and page number describe the selected region. The course retrieval step still searches the text corpus, while the model can use the image to interpret the figure.</p>`,
    },
    {
      id: 'retrieval', title: 'From Canvas files to a cited answer', nav: 'Retrieval & citations',
      body: `<p>The Flask app opens from Canvas through an LTI launch. When an instructor initializes a course, the service creates a Playground record in Firestore and provisions a Vertex AI RAG Engine corpus. It fetches the Canvas files, streams them into Cloud Storage, and imports those objects into the corpus. Firestore records each file’s ID, display name and storage location alongside the course’s corpus ID and initialization state.</p>
        ${flow('Indexing a course', [
          ['Canvas', 'Fetch the course file list and download the files.'],
          ['Cloud Storage', 'Store each file under a stable ID.'],
          ['Vertex AI RAG Engine', 'Import the files into the course corpus.'],
        ], 'Firestore keeps the mapping from the Playground to its corpus and from each file ID to its metadata.')}
        <p>Retrieval-augmented generation (RAG) gives the model course passages to work from. For each question, Flask looks up the course corpus in Firestore, then asks Vertex for nearby chunks by vector similarity. The retrieval service returns the text and source URIs. Flask passes that context, the conversation history and any attached image to the selected model, such as Gemini.</p>
        ${flow('Answering a question', [
          ['Workspace', 'Send the question, conversation and optional image.'],
          ['Flask + Vertex AI', 'Look up the corpus and retrieve matching passages.'],
          ['Gemini', 'Generate a response using the retrieved text.'],
          ['Browser', 'Render the streamed reply. Explorer chat also shows links to course files.'],
        ], 'The retrieval results supply the source links. The model generates the explanation.')}
        <p>The response uses server-sent events. Text arrives in chunks, and the final event includes the cited sources. Flask deduplicates retrieved files, resolves display names through Firestore, and filters and sorts links by retrieval distance. In safe mode, a query with no retrieved context gets a short response explaining that it couldn’t find relevant course material.</p>
        ${screenshot('playground-citations.webp', 1440, 425,
          'Explorer’s Course Assistant showing an explanation of the RC time constant and a clickable link to the lecture PDF in its Sources section.',
          'The Explorer chat displays a source link below the streamed reply. This capture uses the same sample lecture and scripted answer.')}`,
    },
    {
      id: 'explorer', title: 'A concept map for students, question clusters for instructors', nav: 'Graph & analytics',
      body: `<p>The Course Explorer gives students a starting point even when they don’t have a question. During setup, Playground summarizes the files and can suggest topics from those summaries. It retrieves source material for each topic, stores topic summaries and file links in Firestore, and sends the graph to vis-network. A student can open a topic, read its summary, and follow it back to the relevant lectures.</p>
        ${screenshot('playground-explorer.webp', 1440, 820,
          'Playground Course Explorer showing connected nodes for time constants, capacitors and Ohm’s law alongside sample lecture and lab files.',
          'Course Explorer with a sample topic graph. File-to-topic edges show which readings support each concept.')}
        <p>Instructor analytics work from chat events. The backend stores question embeddings with the interaction, groups the vectors with MiniBatchKMeans, and uses a model to label the clusters. The report shows recurring topics and sample questions. Instructors can use those clusters to decide where to revisit an explanation or add an example.</p>`,
    },
    {
      id: 'deployment', title: 'From GitHub Actions to Cloud Run', nav: 'Cloud & CI/CD',
      body: `<p>Flask runs in a Docker container on Cloud Run. The container handles HTTP requests and streaming responses, while managed services hold course data. A new revision can use the same files, corpus and records.</p>
        <figure class="project-flow">
          <strong class="project-flow-title">Where course data lives</strong>
          <span class="project-cloud-runtime">Flask on Cloud Run</span>
          <dl class="project-cloud-services">
            <div><dt>Cloud Storage</dt><dd>Original PDFs and uploaded files</dd></div>
            <div><dt>Vertex AI RAG Engine</dt><dd>Indexed passages for retrieval</dd></div>
            <div><dt>Firestore</dt><dd>Course state, file and topic records, and analytics</dd></div>
          </dl>
          <figcaption>The runtime service account gives Flask access to the services it needs.</figcaption>
        </figure>
        ${flow('Deploying a revision', [
          ['GitHub Actions', 'Authenticate to Google Cloud through Workload Identity Federation.'],
          ['Docker + Artifact Registry', 'Build and push the Flask image with a commit-specific tag.'],
          ['Terraform', 'Load the branch’s remote state and apply its variables with that image tag.'],
          ['Cloud Run', 'Deploy the image as a new service revision.'],
        ], 'The workflow has separate Terraform settings for development and main.')}
        <p>Terraform defines the Cloud Run service, its runtime service account and IAM roles, the storage bucket, the Firestore database, and the domain mapping and DNS records. Cloud Run loads configured secrets from Secret Manager. The repository also has a bootstrap configuration for the buckets that hold Terraform state.</p>
        <p>The checked-in workflow builds the image on configured pushes and pull requests. The Terraform job applies on the <code>development</code> and <code>main</code> branch refs, then promotes the image to the corresponding branch tag. The repo contains test scripts, while the workflow’s unit-test and live-test jobs are currently placeholders.</p>`,
    },
  ],
};

const amdahl = {
  id: 'amdahl',
  name: 'Amdahl',
  tab: 'Amdahl',
  subtitle: 'From agency records to a reviewable report',
  intro: 'Amdahl is a consulting workflow for public agencies. It takes a request and its supporting records, clarifies the scope, retrieves evidence, and assembles analysis into a report a consultant can review. The dashboard shows where that work stands as it moves between stages.',
  videoId: '0XdME2cXink',
  videoStart: 115,
  hero: screenshot('amdahl-console.webp', 1440, 820,
    'Amdahl Multi-Agent Console showing a workflow graph, a research progress bar, and a log of evidence collection.',
    'The local Amdahl console replaying a sample parking strategy request with scripted activity.', { priority: true }),
  role: 'I worked on automated document extraction and standardized metadata. My résumé reports 10,000+ pages processed and an 85% reduction in manual retention-analysis time. The larger consulting workflow was a team project.',
  sections: [
    {
      id: 'extraction', title: 'Make mixed-format records searchable', nav: 'Extraction',
      body: `<p>A single request can come with a PDF policy, a Word memo, and a spreadsheet of costs. In the document warehouse, PDF and Word parsers extract text. Spreadsheet and CSV readers convert tables to searchable text and preserve worksheet names for Excel files. The pipeline splits the resulting text into overlapping chunks, so nearby context can survive a chunk boundary.</p>
        ${flow('Indexing the warehouse', [
          ['Extract', 'Read paragraphs, PDF text, or sheet and CSV tables.'],
          ['Chunk', 'Split with overlap and record the source and chunk index.'],
          ['Embed & index', 'Store passages and metadata in a persistent Chroma collection.'],
          ['Retrieve', 'Return relevant passages with source metadata to the research workflow.'],
        ], 'A file-hash manifest lets the indexer skip unchanged files. Updated files replace their previous chunks.')}
        <p>The warehouse indexer defaults to roughly 1,000 characters per chunk with a 200-character overlap. It tries to split at a sentence or line boundary and uses a SentenceTransformers embedding model when available. At query time, it filters Chroma results by relevance and returns the selected passages in the same finding format used for web research, with an internal source label and the original file metadata.</p>
        <p>Each indexed passage carries a source path, filename, and chunk position. The financial-table extraction path also keeps the PDF page number where it identifies a value. A consultant can trace a cited passage back to its document and verify a number against the table it came from.</p>`,
      extractionExample: true,
    },
    {
      id: 'workflow', title: 'Orchestrate research and review', nav: 'Agent workflow',
      body: `<p>A request enters a LangGraph state machine at clarification. If details are missing, the run pauses for a human reply. Once the scope is clear, the research stage breaks the request into tasks and gathers evidence from the internal warehouse and external sources. Quantitative analysis can route to dedicated forecasting or performance stages when the request calls for them.</p>
        ${flow('From request to review', [
          ['Clarify', 'Confirm the question and required deliverable.'],
          ['Research', 'Gather relevant records and external evidence.'],
          ['Analyze & draft', 'Run the analysis and assemble findings with citations.'],
          ['Review', 'Route QA findings back to drafting or render a PDF for consultant review.'],
        ], 'The graph has separate routes for missing requirements, QA revisions, and requested changes to the PDF.')}
        <p>Each wrapped stage publishes a state snapshot to the session workspace. The Next.js console polls for new activity and updates the agent graph, progress bar, and event log. This gives a reviewer a place to see what the system is doing before they open the finished draft.</p>
        ${screenshot('amdahl-original-workflow.png', 1285, 712,
          'The Amdahl team’s design sketch connecting intake, clarification, research, analysis, quality assurance, and report delivery.',
          'The original team architecture sketch. The implementation uses conditional LangGraph routes for the handoffs and review loop.')}
        <p>The delivery stage assembles a draft and sends it through QA before PDF generation. The workflow pauses again for consultant review of the rendered deliverable. A revision request can route the document back to drafting, where the team can address specific problems in the report.</p>`,
    },
  ],
  links: `<a href="https://amdahl.app/" target="_blank" rel="noopener noreferrer">Project website</a>
    <a href="https://github.com/AaravMohanty/Amdahl" target="_blank" rel="noopener noreferrer">Public repository</a>`,
};

export const projects = [playground, amdahl];
