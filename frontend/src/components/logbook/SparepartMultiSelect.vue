<template>
  <div ref="rootRef" class="space-y-2">
    <!-- Filter tipe item (segmented) -->
    <div class="flex items-center gap-1 overflow-x-auto">
      <button
        v-for="tab in TYPE_TABS"
        :key="tab.value"
        type="button"
        :class="[
          'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition shrink-0',
          activeTab === tab.value
            ? 'bg-primary text-white font-semibold'
            : 'text-ink-2 hover:bg-muted',
        ]"
        :disabled="disabled"
        @click="setTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Pencarian + dropdown hasil -->
    <div class="relative">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3"
        aria-hidden="true"
      />
      <input
        id="sparepart-search"
        v-model="searchQuery"
        type="search"
        :disabled="disabled"
        placeholder="Cari sparepart (nama / kode / spesifikasi)..."
        autocomplete="off"
        :class="[
          'w-full h-10 pl-9 rounded-md border border-line bg-surface text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted',
          /* Sembunyikan tombol clear bawaan browser agar tidak bertumpuk dengan tombol X. */
          '[&::-webkit-search-cancel-button]:appearance-none',
          isDropdownOpen ? 'pr-10' : 'pr-3',
        ]"
        :aria-expanded="isDropdownOpen"
        aria-controls="sparepart-search-results"
        @focus="openDropdown"
        @keydown.esc="closeDropdown"
        @keydown.enter.prevent
      />

      <!-- Tombol tutup dropdown: alternatif click-away yang ramah layar sempit. -->
      <button
        v-if="isDropdownOpen"
        type="button"
        class="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-3 hover:bg-muted hover:text-ink transition focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label="Tutup daftar sparepart"
        @click="closeDropdown"
      >
        <X class="w-4 h-4" />
      </button>

      <div
        v-if="isDropdownOpen"
        id="sparepart-search-results"
        class="absolute z-30 mt-1 w-full rounded-md border border-line bg-surface shadow-card max-h-64 overflow-y-auto"
      >
        <!-- Loading state: skeleton 3 baris -->
        <div v-if="isLoading" class="p-2 space-y-2">
          <div
            v-for="n in 3"
            :key="`sparepart-skeleton-${n}`"
            class="h-10 rounded-md bg-muted animate-pulse"
          />
        </div>

        <p v-else-if="loadError" class="px-3 py-3 text-[11px] text-danger">
          {{ loadError }}
        </p>

        <p v-else-if="results.length === 0" class="px-3 py-3 text-[11px] text-ink-3">
          Sparepart tidak ditemukan.
        </p>

        <ul v-else class="divide-y divide-line">
          <li
            v-for="part in results"
            :key="part.id"
            class="p-2.5 flex items-start gap-2"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold text-ink break-words">
                  {{ part.part_name }}
                </span>
                <span
                  v-if="part.part_code"
                  class="font-mono text-[10px] text-ink-3"
                >
                  {{ part.part_code }}
                </span>
              </div>
              <p
                v-if="part.specification"
                class="text-[10px] text-ink-2 truncate"
                :title="part.specification"
              >
                {{ part.specification }}
              </p>
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-semibold mt-1',
                  part.item_type === 'MACHINE_PART'
                    ? 'bg-primary-soft text-primary'
                    : 'bg-muted text-ink-2',
                ]"
              >
                {{ getItemTypeLabel(part.item_type) }}
              </span>
            </div>

            <span
              v-if="isSelected(part.id)"
              class="inline-flex items-center h-7 px-2 rounded-md border border-line bg-muted text-[10px] font-semibold text-ink-3 shrink-0"
            >
              Sudah dipilih
            </span>
            <button
              v-else
              type="button"
              class="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-primary bg-surface text-primary text-[10px] font-semibold hover:bg-primary-soft transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="disabled"
              @click="addPart(part)"
            >
              <Plus class="w-3 h-3" />
              Tambah
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Part terpilih -->
    <ul v-if="modelValue.length > 0" class="space-y-2">
      <li
        v-for="item in modelValue"
        :key="`selected-${item.sparepart_id}`"
        class="rounded-md border border-line bg-muted p-2.5"
      >
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-ink break-words">
              {{ item.part_name || `Part #${item.sparepart_id}` }}
            </div>
            <span
              v-if="item.part_code"
              class="font-mono text-[10px] text-ink-3 break-all"
            >
              {{ item.part_code }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center w-7 h-7 rounded-md border border-line bg-surface text-danger hover:bg-danger/5 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="disabled"
            :aria-label="`Hapus ${item.part_name || 'sparepart'}`"
            @click="removeItem(item.sparepart_id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <label
            :for="`sparepart-qty-${item.sparepart_id}`"
            class="text-[10px] font-semibold text-ink-2 shrink-0"
          >
            Jumlah
          </label>
          <div class="flex items-center gap-1 min-w-0">
            <input
              :id="`sparepart-qty-${item.sparepart_id}`"
              type="number"
              inputmode="decimal"
              step="0.01"
              min="0.01"
              :value="qtyInputs[item.sparepart_id] ?? item.qty_used"
              :disabled="disabled"
              class="w-20 h-8 px-2 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
              @input="onQtyInput(item, $event)"
              @keydown.enter.prevent
            />
            <span class="text-[11px] font-medium text-ink-2 truncate max-w-[6rem]">
              {{ item.unit || "pcs" }}
            </span>
          </div>
        </div>

        <p
          v-if="qtyErrors[item.sparepart_id]"
          class="text-[10px] font-medium text-danger mt-1"
        >
          {{ qtyErrors[item.sparepart_id] }}
        </p>
      </li>
    </ul>

    <p v-else class="text-[11px] text-ink-3">Belum ada sparepart dipilih</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { Plus, Search, Trash2, X } from "lucide-vue-next";
import { masterService } from "../../services/masterService";
import {
  mergeSparepartItem,
  parseQty,
  updateSparepartQty,
} from "../../utils/sparepartItems";

const props = defineProps({
  /**
   * Daftar part terpilih: `{ sparepart_id, qty_used, part_name, part_code, unit }`.
   * `part_name` / `part_code` / `unit` di-cache dari hasil pencarian agar tidak
   * perlu fetch ulang saat render.
   */
  modelValue: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Selaras enum SparepartItemType di schema.prisma.
const TYPE_TABS = [
  { value: "all", label: "Semua" },
  { value: "MACHINE_PART", label: "Suku Cadang Mesin" },
  { value: "CONSUMABLE_WORKSHOP", label: "Bahan Habis Pakai" },
];

const SEARCH_DEBOUNCE_MS = 300;
const INITIAL_LIMIT = 30;

const rootRef = ref(null);
const activeTab = ref("all");
const searchQuery = ref("");
const isDropdownOpen = ref(false);
const isLoading = ref(false);
const loadError = ref("");
const results = ref([]);

// Nilai mentah input qty (string) per sparepart_id → user boleh mengosongkan
// angka sementara tanpa langsung meng-emit qty tidak valid ke parent.
const qtyInputs = reactive({});
const qtyErrors = reactive({});

let debounceTimer = null;
// Penanda request terakhir agar respons lama tidak menimpa hasil yang lebih baru.
let requestSeq = 0;

const selectedIds = computed(
  () => new Set(props.modelValue.map((item) => Number(item.sparepart_id))),
);

function getItemTypeLabel(itemType) {
  const found = TYPE_TABS.find((tab) => tab.value === itemType);
  return found ? found.label : "Lainnya";
}

function isSelected(sparepartId) {
  return selectedIds.value.has(Number(sparepartId));
}

async function fetchSpareparts({ initial = false } = {}) {
  const seq = ++requestSeq;
  isLoading.value = true;
  loadError.value = "";

  try {
    const params = { includeInactive: false };
    if (initial) params.limit = INITIAL_LIMIT;
    if (activeTab.value !== "all") params.itemType = activeTab.value;
    const keyword = searchQuery.value.trim();
    if (keyword) params.search = keyword;

    const data = await masterService.getSpareparts(params);
    if (seq !== requestSeq) return;

    const list = Array.isArray(data) ? data : [];
    results.value = initial ? list.slice(0, INITIAL_LIMIT) : list;
  } catch (err) {
    if (seq !== requestSeq) return;
    results.value = [];
    loadError.value = err?.message || "Gagal memuat katalog sparepart.";
  } finally {
    if (seq === requestSeq) isLoading.value = false;
  }
}

function openDropdown() {
  if (props.disabled) return;
  isDropdownOpen.value = true;
}

function closeDropdown() {
  isDropdownOpen.value = false;
}

function setTab(value) {
  if (activeTab.value === value) return;
  activeTab.value = value;
  if (debounceTimer) clearTimeout(debounceTimer);
  isDropdownOpen.value = true;
  fetchSpareparts();
}

function emitItems(items) {
  emit("update:modelValue", items);
}

/** Tambah part. Bila sudah ada di daftar → qty digabung, bukan membuat baris baru. */
function addPart(part) {
  if (props.disabled || !part?.id) return;
  const sparepartId = Number(part.id);
  const nextItems = mergeSparepartItem(props.modelValue, part, 1);
  const merged = nextItems.find(
    (item) => Number(item.sparepart_id) === sparepartId,
  );

  qtyInputs[sparepartId] = merged ? merged.qty_used : 1;
  delete qtyErrors[sparepartId];
  emitItems(nextItems);
}

function removeItem(sparepartId) {
  const id = Number(sparepartId);
  delete qtyInputs[id];
  delete qtyErrors[id];
  emitItems(
    props.modelValue.filter((item) => Number(item.sparepart_id) !== id),
  );
}

/** Qty wajib > 0; nilai tidak valid hanya memunculkan error inline (tidak di-emit). */
function onQtyInput(item, event) {
  const sparepartId = Number(item.sparepart_id);
  const raw = event.target.value;
  qtyInputs[sparepartId] = raw;

  const parsed = parseQty(raw);
  if (parsed === null) {
    qtyErrors[sparepartId] = "Jumlah wajib diisi dan lebih dari 0.";
    return;
  }

  delete qtyErrors[sparepartId];
  emitItems(updateSparepartQty(props.modelValue, sparepartId, parsed));
}

// Sinkronkan input qty saat parent mengubah value (reset form / muat draft).
watch(
  () => props.modelValue,
  (items) => {
    const ids = new Set();
    (items || []).forEach((item) => {
      const id = Number(item.sparepart_id);
      ids.add(id);
      if (
        qtyInputs[id] === undefined ||
        Number(qtyInputs[id]) !== Number(item.qty_used)
      ) {
        // Nilai dari parent menimpa input mentah → nilai kini valid lagi.
        qtyInputs[id] = item.qty_used;
        delete qtyErrors[id];
      }
    });
    Object.keys(qtyInputs).forEach((key) => {
      if (!ids.has(Number(key))) {
        delete qtyInputs[key];
        delete qtyErrors[key];
      }
    });
  },
  { immediate: true, deep: true },
);

// Debounce 300 ms agar pencarian tidak membanjiri API.
watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchSpareparts();
  }, SEARCH_DEBOUNCE_MS);
});

// Tutup dropdown saat klik di luar komponen (klik hasil pencarian tetap jalan).
function handleDocumentMouseDown(event) {
  if (!isDropdownOpen.value) return;
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    closeDropdown();
  }
}

onMounted(() => {
  fetchSpareparts({ initial: true });
  document.addEventListener("mousedown", handleDocumentMouseDown);
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  document.removeEventListener("mousedown", handleDocumentMouseDown);
});
</script>
