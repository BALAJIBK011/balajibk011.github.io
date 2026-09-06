import { auth, db, storage } from './firebase.js';
import { ADMIN_EMAIL } from './firebase-config.js';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js';

const $ = s => document.querySelector(s);

const safe = (v = '') =>
  String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

const slug = (v = '') =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'file';

const extOk = (file, types) =>
  types.some(t =>
    t === file.type ||
    (t.endsWith('/*') && file.type.startsWith(t.slice(0, -1)))
  );

const MAX_PDF = 20 * 1024 * 1024;
const MAX_IMG = 10 * 1024 * 1024;

let currentUser = null;
let subjects = [];
let selectedView = 'dashboard';
let tempUploads = [];

function setMsg(el, text, ok = false) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg ' + (ok ? 'ok' : 'error');
}

function requireUser() {
  if (!currentUser) {
    throw new Error('Please sign in again.');
  }

  if (
    currentUser.email?.toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    throw new Error('This account is not authorized.');
  }
}

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (
    user &&
    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    user.emailVerified
  ) {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    $('#adminEmail').textContent = user.email;

    await loadSubjects();
    renderView('dashboard');
  } else if (user) {
    await signOut(auth);

    $('#loginView').classList.remove('hidden');
    $('#appView').classList.add('hidden');

    setMsg(
      $('#loginMsg'),
      user.emailVerified
        ? 'This email is not authorized for the administration portal.'
        : 'Verify the administrator email address before signing in.'
    );
  }
});

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  setMsg($('#loginMsg'), 'Signing in…');

  try {
    await signInWithEmailAndPassword(
      auth,
      $('#loginEmail').value.trim(),
      $('#loginPassword').value
    );
  } catch (err) {
    setMsg($('#loginMsg'), friendlyAuthError(err));
  }
});

$('#resetPassword').addEventListener('click', async () => {
  const email = $('#loginEmail').value.trim();

  if (!email) {
    return setMsg(
      $('#loginMsg'),
      'Enter your admin email first.'
    );
  }

  try {
    await sendPasswordResetEmail(auth, email);

    setMsg(
      $('#loginMsg'),
      'Password reset email sent.',
      true
    );
  } catch (err) {
    setMsg($('#loginMsg'), friendlyAuthError(err));
  }
});

$('#logoutBtn').addEventListener('click', () => signOut(auth));

$('#adminNav').addEventListener('click', e => {
  const b = e.target.closest('button[data-view]');

  if (!b) return;

  selectedView = b.dataset.view;

  $('#adminNav button').forEach(x =>
    x.classList.remove('active')
  );

  b.classList.add('active');

  renderView(selectedView);
});

function friendlyAuthError(err) {
  const code = err.code || '';

  if (code.includes('invalid-credential')) {
    return 'Incorrect email or password.';
  }

  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please wait and try again.';
  }

  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (code.includes('user-disabled')) {
    return 'This administrator account has been disabled.';
  }

  return 'Unable to sign in. Check the details and try again.';
}

async function renderView(view) {
  const titles = {
    dashboard: 'Dashboard',
    'site-media': 'Profile & Images',
    subjects: 'Theory & Practical',
    'upload-material': 'Upload Material',
    'question-papers': 'Question Papers',
    notifications: 'Notifications',
    resources: 'Resources',
    research: 'Research',
    achievements: 'Achievements',
    gallery: 'Gallery',
    published: 'Published Content',
    settings: 'Settings'
  };

  $('#viewTitle').textContent =
    titles[view] || 'Dashboard';

  const c = $('#adminContent');

  if (view === 'dashboard') return renderDashboard(c);
  if (view === 'site-media') return renderSiteMedia(c);
  if (view === 'subjects') return renderSubjects(c);
  if (view === 'upload-material') return renderUploadMaterial(c);
  if (view === 'question-papers') return renderQuestionPapers(c);
  if (view === 'notifications') return renderNotifications(c);
  if (view === 'resources') return renderResources(c);
  if (view === 'research') return renderResearch(c);
  if (view === 'achievements') return renderAchievements(c);
  if (view === 'gallery') return renderGallery(c);
  if (view === 'published') return renderPublished(c);
  if (view === 'settings') return renderSettings(c);
}

async function countCollection(name) {
  try {
    const s = await getDocs(
      query(collection(db, name), limit(200))
    );

    return s.size;
  } catch {
    return 0;
  }
}

async function renderDashboard(c) {
  const [
    contentCount,
    mediaCount,
    subjectCount
  ] = await Promise.all([
    countCollection('content'),
    countCollection('media'),
    countCollection('subjects')
  ]);

  c.innerHTML = `
    <div class="admin-grid stats">

      <div class="admin-stat">
        <span>Published items</span>
        <strong>${contentCount}</strong>
      </div>

      <div class="admin-stat">
        <span>Photos / images</span>
        <strong>${mediaCount}</strong>
      </div>

      <div class="admin-stat">
        <span>Subjects & labs</span>
        <strong>${subjectCount}</strong>
      </div>

      <div class="admin-stat">
        <span>Administrator</span>
        <strong>Active</strong>
      </div>

    </div>

    <div class="admin-panel">

      <div class="panel-title">
        <div>
          <p class="section-kicker">QUICK ACTIONS</p>
          <h2>Publish without editing code</h2>
        </div>
      </div>

      <div class="action-grid">

        <button data-go="site-media">
          🖼 Profile & Images
        </button>

        <button data-go="upload-material">
          📚 Upload Theory / Lab
        </button>

        <button data-go="question-papers">
          📝 Upload Question Paper
        </button>

        <button data-go="notifications">
          🔔 Publish Notification
        </button>

        <button data-go="gallery">
          📸 Upload Gallery Photos
        </button>

        <button data-go="achievements">
          🏆 Add Achievement
        </button>

        <button data-go="research">
          ◈ Add Research
        </button>

        <button data-go="published">
          ☷ Manage Published Content
        </button>

      </div>

    </div>

    <div class="admin-panel">

      <div class="security-note">
        🔒 <strong>Security:</strong>
        there is no public sign-up. Only the administrator
        account configured in Firebase and the Firebase
        Security Rules can create or delete content.
      </div>

    </div>
  `;

  c.querySelectorAll('[data-go]').forEach(b => {
    b.onclick = () => {
      selectedView = b.dataset.go;
      renderView(selectedView);
    };
  });
}

async function loadSubjects() {
  const s = await getDocs(
    collection(db, 'subjects')
  );

  subjects = s.docs
    .map(d => ({
      id: d.id,
      ...d.data()
    }))
    .sort(
      (a, b) =>
        (a.kind || '').localeCompare(b.kind || '') ||
        (a.order || 999) - (b.order || 999)
    );
}

function subjectOptions(kind) {
  return subjects
    .filter(s => !kind || s.kind === kind)
    .map(
      s =>
        `<option value="${safe(s.id)}">${safe(s.name)}</option>`
    )
    .join('');
}

function renderSubjects(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>
          <p class="section-kicker">STRUCTURE</p>

          <h2>Create the exact destinations</h2>

          <p>
            Add your 5 theory subjects and 5 practical/lab
            subjects here. Every upload form uses these
            controlled choices.
          </p>
        </div>

      </div>

      <form id="subjectForm" class="form-grid">

        <label>
          Type

          <select id="subjectKind">
            <option value="theory">
              Theory subject
            </option>

            <option value="lab">
              Practical / Lab
            </option>
          </select>

        </label>

        <label>
          Subject / Lab name

          <input
            id="subjectName"
            required
            placeholder="e.g. R Programming"
          >
        </label>

        <label>
          Order

          <input
            id="subjectOrder"
            type="number"
            min="1"
            max="99"
            value="1"
            required
          >
        </label>

        <div class="form-actions">
          <button
            class="btn primary"
            type="submit"
          >
            Add Subject / Lab
          </button>
        </div>

        <p id="subjectMsg" class="form-msg"></p>

      </form>

    </div>

    <div class="admin-panel">

      <div class="panel-title">
        <h2>Current structure</h2>
      </div>

      <div class="subject-admin-grid">

        ${
          subjects.length
            ? subjects
                .map(
                  s => `
                    <div class="admin-list-card">

                      <span>
                        ${
                          s.kind === 'lab'
                            ? 'PRACTICAL / LAB'
                            : 'THEORY'
                        }
                      </span>

                      <strong>
                        ${safe(s.name)}
                      </strong>

                      <small>
                        Order ${safe(s.order || '')}
                      </small>

                      <button
                        data-del-subject="${safe(s.id)}"
                        class="danger-link"
                      >
                        Delete
                      </button>

                    </div>
                  `
                )
                .join('')
            : '<div class="empty-admin">No subjects yet.</div>'
        }

      </div>

    </div>
  `;

  $('#subjectForm').onsubmit = async e => {
    e.preventDefault();

    try {
      requireUser();

      const id = slug(
        $('#subjectKind').value +
        '-' +
        $('#subjectName').value
      );

      await setDoc(
        doc(db, 'subjects', id),
        {
          kind: $('#subjectKind').value,
          name: $('#subjectName').value.trim(),
          order:
            Number($('#subjectOrder').value) || 1,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setMsg(
        $('#subjectMsg'),
        'Subject saved.',
        true
      );

      await loadSubjects();
      renderSubjects(c);

    } catch (err) {
      setMsg(
        $('#subjectMsg'),
        err.message
      );
    }
  };

  c.querySelectorAll(
    '[data-del-subject]'
  ).forEach(b => {
    b.onclick = async () => {

      if (
        !confirm(
          'Delete this subject definition? Existing published materials will remain, but new uploads will no longer target it.'
        )
      ) {
        return;
      }

      await deleteDoc(
        doc(
          db,
          'subjects',
          b.dataset.delSubject
        )
      );

      await loadSubjects();
      renderSubjects(c);
    };
  });
}

function commonUploadFields(
  category,
  extra = ''
) {
  return `
    <form id="uploadForm" class="form-grid">

      <input
        type="hidden"
        id="category"
        value="${safe(category)}"
      >

      ${extra}

      <label>
        Display title

        <input
          id="title"
          required
          placeholder="Name shown to students"
        >
      </label>

      <label>
        Description

        <textarea
          id="description"
          rows="3"
          placeholder="Optional short description"
        ></textarea>
      </label>

      <label>
        PDF / document

        <input
          id="file"
          type="file"
          accept="application/pdf"
          required
        >
      </label>

      <div class="form-actions">

        <button
          class="btn primary"
          type="submit"
        >
          Upload & Publish
        </button>

        <button
          class="btn ghost"
          type="reset"
        >
          Clear
        </button>

      </div>

      <p class="upload-hint">
        Use public academic material only.
        The visible title is stored separately
        from the filename.
      </p>

      <p id="formMsg" class="form-msg"></p>

    </form>
  `;
}

function renderUploadMaterial(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>
          <p class="section-kicker">ACADEMICS</p>

          <h2>Theory / Practical / Lab</h2>

          <p>
            Select the exact subject or lab;
            the published item will appear under
            that destination on the public website.
          </p>
        </div>

      </div>

      ${commonUploadFields(
        'material',
        `
          <label>
            Destination

            <select id="destination">

              <option value="theory">
                Theory subject
              </option>

              <option value="lab">
                Practical / Lab
              </option>

            </select>
          </label>

          <label>
            Subject / Lab

            <select id="subjectId">
              ${subjectOptions('theory')}
            </select>
          </label>

          <label>
            Material type

            <select id="materialType">

              <option>Notes</option>
              <option>Syllabus</option>
              <option>PPT</option>
              <option>Study Material</option>
              <option>Lab Manual</option>
              <option>Programs</option>
              <option>Important Programs</option>
              <option>Viva</option>
              <option>Practical Preparation</option>
              <option>Other</option>

            </select>
          </label>
        `
      )}

    </div>
  `;

  const dest = $('#destination');
  const sub = $('#subjectId');

  dest.onchange = () => {
    sub.innerHTML =
      subjectOptions(dest.value);

    const lab = dest.value === 'lab';

    $('#materialType').value =
      lab ? 'Lab Manual' : 'Notes';
  };

  bindUploadForm({
    type: 'material',

    buildMeta: () => {
      const s = subjects.find(
        x => x.id === sub.value
      );

      return {
        category: 'material',
        subjectId: s?.id || '',
        subjectName: s?.name || '',
        destination: dest.value,
        materialType:
          $('#materialType').value
      };
    }
  });
}

function renderQuestionPapers(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>
          <p class="section-kicker">
            QUESTION PAPERS
          </p>

          <h2>
            Year → Type → Subject
          </h2>

          <p>
            Students will see the paper in the
            corresponding academic year and subject.
          </p>
        </div>

      </div>

      ${commonUploadFields(
        'qp',
        `
          <label>
            Academic year

            <select id="yearSelect">
              ${yearOptions()}
            </select>
          </label>

          <label>
            Paper type

            <select id="paperType">

              <option>Theory</option>

              <option>
                Practical / Lab
              </option>

            </select>
          </label>

          <label>
            Subject / Lab

            <select id="qpSubject">
              ${subjectOptions('theory')}
            </select>
          </label>
        `
      )}

    </div>
  `;

  $('#paperType').onchange = () => {
    $('#qpSubject').innerHTML =
      subjectOptions(
        $('#paperType').value === 'Theory'
          ? 'theory'
          : 'lab'
      );
  };

  bindUploadForm({
    type: 'qp',

    buildMeta: () => {
      const s = subjects.find(
        x => x.id === $('#qpSubject').value
      );

      return {
        category: 'qp',
        year: $('#yearSelect').value,
        paperType:
          $('#paperType').value,
        subjectId: s?.id || '',
        subjectName: s?.name || ''
      };
    }
  });
}

function yearOptions() {
  const y = new Date().getFullYear();

  return Array.from(
    { length: 8 },
    (_, i) => {
      const end = y - i;

      return `
        <option>
          ${end - 1}–${String(end).slice(-2)}
        </option>
      `;
    }
  ).join('');
}

function renderNotifications(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            NOTIFICATIONS
          </p>

          <h2>
            Publish a new update
          </h2>

          <p>
            Every notification is dated automatically.
            The public site marks items as NEW for 48 hours.
          </p>

        </div>

      </div>

      ${commonUploadFields(
        'notification',
        `
          <label>
            Notification type

            <select id="noticeType">

              <option>Academic</option>
              <option>Examination</option>
              <option>University</option>
              <option>Department</option>
              <option>General</option>

            </select>
          </label>
        `
      )}

    </div>
  `;

  bindUploadForm({
    type: 'notification',

    buildMeta: () => ({
      category: 'notification',
      noticeType:
        $('#noticeType').value
    })
  });
}

function renderResources(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            GENERAL RESOURCES
          </p>

          <h2>
            Publish general academic documents
          </h2>

        </div>

      </div>

      ${commonUploadFields(
        'resource',
        `
          <label>
            Resource type

            <select id="resourceType">

              <option>Academic Calendar</option>
              <option>Timetable</option>
              <option>University Notification</option>
              <option>General Study Material</option>
              <option>Useful Document</option>
              <option>Other</option>

            </select>
          </label>
        `
      )}

    </div>
  `;

  bindUploadForm({
    type: 'resource',

    buildMeta: () => ({
      category: 'resource',
      resourceType:
        $('#resourceType').value
    })
  });
}

function renderResearch(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            RESEARCH
          </p>

          <h2>
            Publications, projects and professional activity
          </h2>

        </div>

      </div>

      <form
        id="researchForm"
        class="form-grid"
      >

        <label>
          Type

          <select id="researchType">

            <option>Publication</option>
            <option>Research Interest</option>
            <option>Project</option>
            <option>Conference</option>
            <option>FDP / Workshop</option>
            <option>Certification</option>

          </select>
        </label>

        <label>
          Title

          <input
            id="researchTitle"
            required
          >
        </label>

        <label>
          Description

          <textarea
            id="researchDesc"
            rows="4"
          ></textarea>
        </label>

        <label>
          External link

          <input
            id="researchLink"
            type="url"
            placeholder="https://…"
          >
        </label>

        <label>
          Optional PDF

          <input
            id="researchFile"
            type="file"
            accept="application/pdf"
          >
        </label>

        <div class="form-actions">

          <button
            class="btn primary"
            type="submit"
          >
            Publish Research
          </button>

        </div>

        <p
          id="researchMsg"
          class="form-msg"
        ></p>

      </form>

    </div>
  `;

  $('#researchForm').onsubmit = async e => {
    e.preventDefault();

    try {
      requireUser();

      const f =
        $('#researchFile').files[0];

      if (
        f &&
        (
          f.type !== 'application/pdf' ||
          f.size > MAX_PDF
        )
      ) {
        throw new Error(
          'PDF must be under 20 MB.'
        );
      }

      let url =
        $('#researchLink').value.trim();

      let path = '';

      if (f) {
        ({
          url,
          path
        } = await uploadFile(
          f,
          `research/${Date.now()}-${slug(f.name)}`
        ));
      }

      await addDoc(
        collection(db, 'content'),
        {
          category: 'research',
          type:
            $('#researchType').value,
          title:
            $('#researchTitle').value.trim(),
          description:
            $('#researchDesc').value.trim(),
          url,
          path,
          createdAt:
            serverTimestamp(),
          publishedAt:
            serverTimestamp()
        }
      );

      setMsg(
        $('#researchMsg'),
        'Research item published.',
        true
      );

      $('#researchForm').reset();

    } catch (err) {
      setMsg(
        $('#researchMsg'),
        err.message
      );
    }
  };
}

function renderAchievements(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            ACHIEVEMENTS
          </p>

          <h2>
            Awards, qualifications and certificates
          </h2>

        </div>

      </div>

      <form
        id="achievementForm"
        class="form-grid"
      >

        <label>
          Category

          <select id="achCategory">

            <option>Awards</option>
            <option>Academic Achievements</option>
            <option>Certifications</option>
            <option>Honors</option>
            <option>Research Achievements</option>
            <option>Teaching Achievements</option>
            <option>Conferences</option>
            <option>Workshops / FDPs</option>
            <option>Student Achievements</option>
            <option>Department Achievements</option>

          </select>
        </label>

        <label>
          Title

          <input
            id="achTitle"
            required
          >
        </label>

        <label>
          Description

          <textarea
            id="achDesc"
            rows="3"
          ></textarea>
        </label>

        <label>
          Date / Year

          <input
            id="achDate"
            placeholder="2026"
          >
        </label>

        <label>
          Certificate / PDF

          <input
            id="achFile"
            type="file"
            accept="application/pdf"
          >
        </label>

        <label>
          Achievement photo

          <input
            id="achImage"
            type="file"
            accept="image/*"
          >
        </label>

        <div class="form-actions">

          <button
            class="btn primary"
            type="submit"
          >
            Publish Achievement
          </button>

        </div>

        <p
          id="achMsg"
          class="form-msg"
        ></p>

      </form>

    </div>
  `;

  $('#achievementForm').onsubmit = async e => {
    e.preventDefault();

    try {
      requireUser();

      const pf =
        $('#achFile').files[0];

      const img =
        $('#achImage').files[0];

      if (
        pf &&
        (
          pf.type !== 'application/pdf' ||
          pf.size > MAX_PDF
        )
      ) {
        throw new Error(
          'Certificate PDF must be under 20 MB.'
        );
      }

      if (
        img &&
        (
          !img.type.startsWith('image/') ||
          img.size > MAX_IMG
        )
      ) {
        throw new Error(
          'Image must be under 10 MB.'
        );
      }

      let pdfUrl = '';
      let pdfPath = '';
      let imageUrl = '';
      let imagePath = '';

      if (pf) {
        ({
          url: pdfUrl,
          path: pdfPath
        } = await uploadFile(
          pf,
          `achievements/${Date.now()}-${slug(pf.name)}`
        ));
      }

      if (img) {
        ({
          url: imageUrl,
          path: imagePath
        } = await uploadFile(
          img,
          `achievements/${Date.now()}-${slug(img.name)}`
        ));
      }

      await addDoc(
        collection(db, 'content'),
        {
          category: 'achievement',
          type:
            $('#achCategory').value,
          title:
            $('#achTitle').value.trim(),
          description:
            $('#achDesc').value.trim(),
          date:
            $('#achDate').value.trim(),
          url: pdfUrl,
          path: pdfPath,
          imageUrl,
          imagePath,
          createdAt:
            serverTimestamp(),
          publishedAt:
            serverTimestamp()
        }
      );

      setMsg(
        $('#achMsg'),
        'Achievement published.',
        true
      );

      $('#achievementForm').reset();

    } catch (err) {
      setMsg(
        $('#achMsg'),
        err.message
      );
    }
  };
}

function renderGallery(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            GALLERY
          </p>

          <h2>
            Upload event photographs
          </h2>

          <p>
            Choose a category and publish photos
            directly into the public gallery.
          </p>

        </div>

      </div>

      <form
        id="galleryForm"
        class="form-grid"
      >

        <label>
          Category

          <select id="galleryCategory">

            <option>Academic Events</option>
            <option>Workshops</option>
            <option>Seminars</option>
            <option>Student Activities</option>
            <option>Department</option>
            <option>Campus</option>
            <option>Achievements</option>
            <option>Other</option>

          </select>
        </label>

        <label>
          Event / Album title

          <input
            id="galleryTitle"
            required
          >
        </label>

        <label>
          Caption

          <input
            id="galleryCaption"
          >
        </label>

        <label>
          Photos

          <input
            id="galleryFiles"
            type="file"
            accept="image/*"
            multiple
            required
          >
        </label>

        <div class="form-actions">

          <button
            class="btn primary"
            type="submit"
          >
            Upload & Publish Photos
          </button>

        </div>

        <p class="upload-hint">
          Each image must be 10 MB or smaller.
        </p>

        <p
          id="galleryMsg"
          class="form-msg"
        ></p>

      </form>

    </div>
  `;

  $('#galleryForm').onsubmit =
    async e => {
      e.preventDefault();

      try {
        requireUser();

        const files = [
          ...$('#galleryFiles').files
        ];

        if (!files.length) {
          throw new Error(
            'Choose at least one photo.'
          );
        }

        for (const f of files) {
          if (
            !f.type.startsWith('image/') ||
            f.size > MAX_IMG
          ) {
            throw new Error(
              `Invalid image: ${f.name}`
            );
          }

          const {
            url,
            path
          } = await uploadFile(
            f,
            `gallery/${Date.now()}-${slug(f.name)}`
          );

          await addDoc(
            collection(db, 'media'),
            {
              kind: 'gallery',
              category:
                $('#galleryCategory').value,
              title:
                $('#galleryTitle').value.trim(),
              caption:
                $('#galleryCaption').value.trim(),
              url,
              path,
              createdAt:
                serverTimestamp()
            }
          );
        }

        setMsg(
          $('#galleryMsg'),
          `${files.length} photo(s) published.`,
          true
        );

        $('#galleryForm').reset();

      } catch (err) {
        setMsg(
          $('#galleryMsg'),
          err.message
        );
      }
    };
}

async function renderSiteMedia(c) {
  const settings =
    await getDoc(
      doc(db, 'siteSettings', 'main')
    );

  const s =
    settings.exists()
      ? settings.data()
      : {};

  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            PROFILE & IMAGES
          </p>

          <h2>
            Manage the visual identity
          </h2>

          <p>
            Replace your profile photo and
            homepage background, or add
            university/department photographs.
          </p>

        </div>

      </div>

      <div class="media-upload-grid">

        <div class="media-card">

          <h3>
            Profile Photo
          </h3>

          <img
            class="admin-preview"
            src="${safe(
              s.profileUrl ||
              '../assets/profile-placeholder.svg'
            )}"
            alt="Profile"
          >

          <input
            id="profileFile"
            type="file"
            accept="image/*"
          >

          <button
            class="btn primary"
            id="uploadProfile"
          >
            Replace Profile Photo
          </button>

        </div>

        <div class="media-card">

          <h3>
            Home Background
          </h3>

          ${
            s.heroUrl
              ? `
                <img
                  class="admin-preview wide"
                  src="${safe(s.heroUrl)}"
                  alt="Background"
                >
              `
              : ''
          }

          <input
            id="heroFile"
            type="file"
            accept="image/*"
          >

          <button
            class="btn primary"
            id="uploadHero"
          >
            Replace Background
          </button>

        </div>

        <div class="media-card">

          <h3>
            University Photo
          </h3>

          <input
            id="univFile"
            type="file"
            accept="image/*"
          >

          <input
            id="univTitle"
            placeholder="Title, e.g. Suvarna Gange Campus"
          >

          <button
            class="btn primary"
            id="uploadUniv"
          >
            Add University Photo
          </button>

        </div>

        <div class="media-card">

          <h3>
            Department Photo
          </h3>

          <input
            id="deptFile"
            type="file"
            accept="image/*"
          >

          <input
            id="deptTitle"
            placeholder="Title, e.g. Computer Lab"
          >

          <button
            class="btn primary"
            id="uploadDept"
          >
            Add Department Photo
          </button>

        </div>

      </div>

      <p
        id="mediaMsg"
        class="form-msg"
      ></p>

    </div>

    <div class="admin-panel">

      <div class="security-note">
        Recommended profile image: square JPG/PNG.
        Recommended hero image: wide campus photograph.
        Do not upload student photos or personal documents
        without appropriate permission.
      </div>

    </div>
  `;

  $('#uploadProfile').onclick =
    () =>
      replaceSiteImage(
        'profile',
        $('#profileFile').files[0]
      );

  $('#uploadHero').onclick =
    () =>
      replaceSiteImage(
        'hero',
        $('#heroFile').files[0]
      );

  $('#uploadUniv').onclick =
    () =>
      addSiteMedia(
        'university',
        $('#univFile').files[0],
        $('#univTitle').value
      );

  $('#uploadDept').onclick =
    () =>
      addSiteMedia(
        'department',
        $('#deptFile').files[0],
        $('#deptTitle').value
      );
}

async function validateImage(f) {
  if (!f) {
    throw new Error(
      'Choose an image first.'
    );
  }

  if (
    !f.type.startsWith('image/') ||
    f.size > MAX_IMG
  ) {
    throw new Error(
      'Image must be under 10 MB.'
    );
  }
}

async function replaceSiteImage(slot, f) {
  try {
    requireUser();

    await validateImage(f);

    const {
      url,
      path
    } = await uploadFile(
      f,
      `site/${slot}-${Date.now()}-${slug(f.name)}`
    );

    const data =
      await getDoc(
        doc(db, 'siteSettings', 'main')
      );

    const old =
      data.exists()
        ? data.data()
        : {};

    if (
      (slot === 'profile' &&
        old.profilePath) ||
      (slot === 'hero' &&
        old.heroPath)
    ) {
      try {
        await deleteObject(
          ref(
            storage,
            slot === 'profile'
              ? old.profilePath
              : old.heroPath
          )
        );
      } catch {}
    }

    await setDoc(
      doc(db, 'siteSettings', 'main'),
      {
        [slot + 'Url']: url,
        [slot + 'Path']: path,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    setMsg(
      $('#mediaMsg'),
      slot === 'profile'
        ? 'Profile photo updated.'
        : 'Homepage background updated.',
      true
    );

    renderSiteMedia(
      $('#adminContent')
    );

  } catch (err) {
    setMsg(
      $('#mediaMsg'),
      err.message
    );
  }
}

async function addSiteMedia(
  kind,
  f,
  title
) {
  try {
    requireUser();

    await validateImage(f);

    if (!title.trim()) {
      throw new Error(
        'Enter a title.'
      );
    }

    const {
      url,
      path
    } = await uploadFile(
      f,
      `site/${kind}-${Date.now()}-${slug(f.name)}`
    );

    await addDoc(
      collection(db, 'media'),
      {
        kind,
        category:
          kind === 'university'
            ? 'University'
            : 'Department',
        title: title.trim(),
        caption: title.trim(),
        url,
        path,
        createdAt:
          serverTimestamp()
      }
    );

    setMsg(
      $('#mediaMsg'),
      'Image published.',
      true
    );

    renderSiteMedia(
      $('#adminContent')
    );

  } catch (err) {
    setMsg(
      $('#mediaMsg'),
      err.message
    );
  }
}

async function uploadFile(
  file,
  path
) {
  const storageRef =
    ref(storage, path);

  await uploadBytes(
    storageRef,
    file,
    {
      contentType: file.type,
      cacheControl:
        'public,max-age=31536000'
    }
  );

  return {
    url:
      await getDownloadURL(
        storageRef
      ),
    path
  };
}

async function bindUploadForm({
  type,
  buildMeta
}) {
  $('#uploadForm').onsubmit =
    async e => {
      e.preventDefault();

      try {
        requireUser();

        const f =
          $('#file').files[0];

        if (
          !f ||
          f.type !==
            'application/pdf'
        ) {
          throw new Error(
            'Please choose a PDF file.'
          );
        }

        if (f.size > MAX_PDF) {
          throw new Error(
            'PDF must be 20 MB or smaller.'
          );
        }

        const meta =
          buildMeta();

        if (
          !meta.subjectId &&
          type === 'material'
        ) {
          throw new Error(
            'Choose a subject or lab.'
          );
        }

        const {
          url,
          path
        } = await uploadFile(
          f,
          `${type}/${Date.now()}-${slug(f.name)}`
        );

        await addDoc(
          collection(db, 'content'),
          {
            ...meta,
            title:
              $('#title').value.trim(),
            description:
              $('#description').value.trim(),
            url,
            path,
            fileName: f.name,
            createdAt:
              serverTimestamp(),
            publishedAt:
              serverTimestamp()
          }
        );

        setMsg(
          $('#formMsg'),
          'Published successfully. It is now visible in the corresponding public section.',
          true
        );

        $('#uploadForm').reset();

      } catch (err) {
        setMsg(
          $('#formMsg'),
          err.message
        );
      }
    };
}

async function renderPublished(c) {
  const snap =
    await getDocs(
      query(
        collection(db, 'content'),
        orderBy(
          'publishedAt',
          'desc'
        ),
        limit(250)
      )
    );

  const items =
    snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            CONTENT MANAGEMENT
          </p>

          <h2>
            Published content
          </h2>

          <p>
            Delete an item to remove its public listing.
            The linked file is deleted from Firebase Storage
            as well.
          </p>

        </div>

      </div>

      <div class="published-table">

        ${
          items.length
            ? items
                .map(
                  x => `
                    <div class="published-row">

                      <div>

                        <span>
                          ${safe(x.category || '')}
                        </span>

                        <strong>
                          ${safe(
                            x.title ||
                            'Untitled'
                          )}
                        </strong>

                        <small>
                          ${safe(
                            x.subjectName ||
                            x.year ||
                            x.type ||
                            ''
                          )}
                          ·
                          ${
                            x.publishedAt &&
                            x.publishedAt.toDate
                              ? x.publishedAt
                                  .toDate()
                                  .toLocaleDateString(
                                    'en-IN'
                                  )
                              : ''
                          }
                        </small>

                      </div>

                      <div class="row-actions">

                        ${
                          x.url
                            ? `
                              <a
                                href="${safe(x.url)}"
                                target="_blank"
                                rel="noopener"
                              >
                                View
                              </a>
                            `
                            : ''
                        }

                        <button
                          class="danger"
                          data-delete-content="${safe(x.id)}"
                          data-path="${safe(x.path || '')}"
                        >
                          Delete
                        </button>

                      </div>

                    </div>
                  `
                )
                .join('')
            : `
              <div class="empty-admin">
                No content published yet.
              </div>
            `
        }

      </div>

    </div>
  `;

  c.querySelectorAll(
    '[data-delete-content]'
  ).forEach(b => {
    b.onclick = async () => {

      if (
        !confirm(
          'Delete this published item?'
        )
      ) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            db,
            'content',
            b.dataset.deleteContent
          )
        );

        if (b.dataset.path) {
          try {
            await deleteObject(
              ref(
                storage,
                b.dataset.path
              )
            );
          } catch {}
        }

        renderPublished(c);

      } catch (err) {
        alert(err.message);
      }
    };
  });
}

function renderSettings(c) {
  c.innerHTML = `
    <div class="admin-panel">

      <div class="panel-title">

        <div>

          <p class="section-kicker">
            SECURITY
          </p>

          <h2>
            Administration settings
          </h2>

        </div>

      </div>

      <div class="settings-list">

        <div>
          <strong>
            Administrator email
          </strong>

          <span>
            ${safe(ADMIN_EMAIL)}
          </span>
        </div>

        <div>
          <strong>
            Authentication
          </strong>

          <span>
            Firebase Email/Password ·
            email verification required
          </span>
        </div>

        <div>
          <strong>
            Public content
          </strong>

          <span>
            Only content you explicitly publish
            from this portal is listed publicly.
          </span>
        </div>

        <div>
          <strong>
            Password
          </strong>

          <span>
            Use “Forgot password?” on the login
            page to reset it.
          </span>
        </div>

      </div>

    </div>

    <div class="admin-panel">

      <div class="security-note">
        For stronger protection, enable Firebase
        App Check (reCAPTCHA Enterprise) after the
        first deployment. Keep Firestore and Storage
        in Production/Locked rules; never paste a
        service-account key into this website.
      </div>

    </div>
  `;
}
