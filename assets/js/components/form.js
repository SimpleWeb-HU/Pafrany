// Register interest form ([data-pbr-form]) – demo behaviour only.
// Validates on blur and submit, shows field + form error states and a
// success state. Pre-fills "Interested in" from ?unit= or ?type=.
// The real submission is handled by Crown's Forms module.
// Choice groups ([data-choice-group] fieldsets of radios or checkboxes) are
// validated as a group: with data-required at least one option is needed.

function fieldValid(field) {
  if (field.type === 'checkbox') return !field.required || field.checked;
  if (!field.required && !field.value.trim()) return true;
  return field.checkValidity() && (!field.required || field.value.trim() !== '');
}

const groupValid = (g) => !('required' in g.dataset) || !!g.querySelector('input:checked');

function markGroup(g) {
  const ok = groupValid(g);
  g.classList.toggle('is-invalid', !ok);
  g.setAttribute('aria-invalid', String(!ok));
  return ok;
}

function mark(field) {
  const ok = fieldValid(field);
  field.classList.toggle('is-invalid', !ok);
  field.setAttribute('aria-invalid', String(!ok));
  return ok;
}

export function initForm(root = document) {
  root.querySelectorAll('[data-pbr-form]').forEach((form) => {
    if (form.dataset.formInit) return;
    form.dataset.formInit = 'true';
    form.noValidate = true;

    const error = form.querySelector('[data-form-error]');
    const success = form.querySelector('[data-form-success]');
    const fields = [...form.querySelectorAll('input, select, textarea')]
      .filter((f) => f.type !== 'hidden' && !f.closest('[data-choice-group]'));
    const groups = [...form.querySelectorAll('[data-choice-group]')];
    groups.forEach((g) => g.addEventListener('change', () => g.classList.contains('is-invalid') && markGroup(g)));

    // Pre-fill from query string (links from the residences table)
    const params = new URLSearchParams(window.location.search);
    const interest = form.querySelector('[name="interest"]');
    const preset = params.get('unit') || params.get('type');
    if (interest && preset) interest.value = preset;

    fields.forEach((field) => {
      field.addEventListener('blur', () => field.required && mark(field));
      field.addEventListener('input', () => field.classList.contains('is-invalid') && mark(field));
      field.addEventListener('change', () => field.classList.contains('is-invalid') && mark(field));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const invalid = fields.filter((f) => !mark(f));
      const invalidGroups = groups.filter((g) => !markGroup(g));
      if (invalid.length || invalidGroups.length) {
        if (error) error.hidden = false;
        // focus the first problem in document order
        const first = [...invalid, ...invalidGroups.map((g) => g.querySelector('input'))]
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0];
        first.focus();
        return;
      }
      if (error) error.hidden = true;
      if (success) success.hidden = false;
      form.classList.add('is-sent');
      success?.focus();
    });
  });
}
