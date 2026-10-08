/**
 * Legal Sthal - Admin Service Management & Stage Update View
 */

import { serviceService } from '../../services/serviceService.js';
import { spocService } from '../../services/spocService.js';
import { renderStatusBadge, renderTimeline, renderSpocCard, icons } from '../../ui/components.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminServiceDetail(serviceId) {
  const data = await serviceService.getServiceDetails(serviceId);
  if (!data || !data.service) {
    return `
      <div class="empty-state">
        <h3>Service Record Not Found</h3>
        <p>The service ID "${serviceId}" does not exist in the administrative system.</p>
        <a href="#admin/services" class="btn btn-primary">Back to Service Management</a>
      </div>
    `;
  }

  const { service, client, spoc } = data;
  const allSpocs = await spocService.getSpocs();

  return `
    <div class="page-header">
      <div>
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
          <a href="#admin/services" style="color: var(--text-muted); font-size: 0.875rem;">← Back to Service List</a>
          <span style="color: var(--text-light);">|</span>
          <span style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-500); background-color: var(--primary-50); padding: 0.15rem 0.5rem; border-radius: 4px;">Code: ${service.serviceCode}</span>
        </div>
        <h1 class="page-title">${service.serviceType}</h1>
        <p class="page-subtitle">Client: ${client ? client.companyName : ''} (${service.clientId}) • Entity: ${service.companyType}</p>
      </div>

      <div class="page-actions">
        ${renderStatusBadge(service.status)}
      </div>
    </div>

    <!-- Admin Stage Update Control Box -->
    <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--primary-500);">
      <div class="card-header">
        <h3 class="card-title">${icons.sync} Administrative Stage Controller</h3>
        <span style="font-size: 0.8125rem; font-weight: 600; color: var(--primary-500);">
          Current Stage Index: ${service.currentStageIndex + 1} of ${service.stages.length}
        </span>
      </div>

      <div class="card-body">
        <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 260px;">
            <label class="form-label">Select Target Operational Stage</label>
            <select class="form-control" id="admin-stage-selector" style="font-weight: 600; font-size: 0.95rem; padding: 0.65rem 0.85rem; border: 1.5px solid var(--primary-500); background-color: var(--bg-surface);">
              ${service.stages.map((st, idx) => {
                const stageName = st.name || st.stageName || st.stage_name || `Stage ${idx + 1}`;
                let tag = 'Pending';
                if (idx < service.currentStageIndex) tag = '✓ Completed';
                else if (idx === service.currentStageIndex) tag = '● Current Active';
                return `
                <option value="${idx}" ${idx === service.currentStageIndex ? 'selected' : ''}>
                  Stage ${idx + 1}: ${stageName} — [${tag}]
                </option>
              `;
              }).join('')}
            </select>
          </div>

          <div style="margin-top: 1.5rem;">
            <button class="btn btn-primary btn-lg" id="admin-update-stage-btn" data-service-id="${service.id}">
              ${icons.check} Update Stage
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-3">
      <!-- Live Stage Timeline -->
      <div style="grid-column: span 2;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${icons.sync} Live Client Timeline Representation</h3>
          </div>
          <div class="card-body">
            ${renderTimeline(service.stages, service.currentStageIndex)}
          </div>
        </div>
      </div>

      <!-- SPOC Reassignment & Client Details -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${icons.profile} Assigned SPOC Management</h3>
          </div>
          <div class="card-body">
            ${renderSpocCard(spoc)}

            <div style="margin-top: 1.25rem; border-top: 1px solid var(--divider); padding-top: 1rem;">
              <label class="form-label">Reassign Service SPOC</label>
              <div style="display: flex; gap: 0.5rem;">
                <select class="form-control" id="reassign-spoc-select">
                  ${allSpocs.map(s => `
                    <option value="${s.id}" ${s.id === service.spocId ? 'selected' : ''}>${s.name} (${s.title})</option>
                  `).join('')}
                </select>
                <button class="btn btn-secondary" id="confirm-reassign-spoc-btn" data-service-id="${service.id}">Reassign</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindAdminServiceDetailEvents() {
  document.addEventListener('click', (e) => {
    const updateBtn = e.target.closest('#admin-update-stage-btn');
    if (updateBtn) {
      const serviceId = updateBtn.dataset.serviceId;
      const stageSelect = document.getElementById('admin-stage-selector');
      const targetIndex = Number(stageSelect.value);

      serviceService.getServiceDetails(serviceId).then(data => {
        const service = data.service;
        const currentStageName = service.stages?.[service.currentStageIndex]?.name || service.stages?.[service.currentStageIndex]?.stageName || service.currentStage || 'Current Stage';
        const targetStageName = service.stages?.[targetIndex]?.name || service.stages?.[targetIndex]?.stageName || `Stage ${targetIndex + 1}`;

        if (targetIndex === service.currentStageIndex) {
          toast.info('No Change', `Service is already at Stage ${targetIndex + 1}: '${targetStageName}'`);
          return;
        }

        modal.open({
          title: 'Confirm Operational Stage Update',
          bodyHtml: `
            <div style="text-align: center; padding: 1.25rem 0.5rem;">
              <p style="font-size: 1rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                Are you sure you want to transition service <strong>${service.serviceCode}</strong>?
              </p>
              <div style="background: var(--bg-surface); border: 1px solid var(--divider); border-radius: 8px; padding: 1rem; margin: 1rem auto; max-width: 440px; text-align: left;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--divider);">
                  <span style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">Current Stage:</span>
                  <span style="font-size: 0.9375rem; color: var(--text-main); font-weight: 700;">Stage ${service.currentStageIndex + 1}: ${currentStageName}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 0.8125rem; color: var(--primary-500); font-weight: 700;">Target Stage:</span>
                  <span style="font-size: 1.05rem; color: var(--primary-500); font-weight: 800;">Stage ${targetIndex + 1}: ${targetStageName}</span>
                </div>
              </div>
              <div class="form-hint" style="margin-top: 1rem; font-size: 0.8125rem; color: var(--text-muted);">
                ${icons.sync} This action will instantly update the client portal timeline and dispatch automated status notifications.
              </div>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary js-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="confirm-stage-change-btn">${icons.check} Confirm & Update Stage</button>
          `,
          onOpen: () => {
            document.querySelector('.js-modal-cancel').onclick = () => modal.close();
            document.getElementById('confirm-stage-change-btn').onclick = async () => {
              const confirmBtn = document.getElementById('confirm-stage-change-btn');
              confirmBtn.disabled = true;
              confirmBtn.textContent = 'Updating...';

              await serviceService.updateServiceStage(serviceId, targetIndex);
              toast.success('Stage Updated', `Service stage moved to '${targetStageName}' successfully.`);
              modal.close();
              if (window.appInstance) {
                window.appInstance.handleRoute();
              }
            };
          }
        });
      });
    }

    const reassignBtn = e.target.closest('#confirm-reassign-spoc-btn');
    if (reassignBtn) {
      const serviceId = reassignBtn.dataset.serviceId;
      const spocId = document.getElementById('reassign-spoc-select').value;
      spocService.assignSpoc(serviceId, spocId).then(() => {
        toast.success('SPOC Reassigned', 'Service SPOC updated successfully.');
        if (window.appInstance) {
          window.appInstance.handleRoute();
        }
      });
    }
  });
}
