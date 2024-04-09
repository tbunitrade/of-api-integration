<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { mdiEye, mdiPen, mdiTrashCan } from '@mdi/js';
import CardBoxModal from '@/components/CardBoxModal.vue';
import TableCheckboxCell from '@/components/TableCheckboxCell.vue';
import BaseLevel from '@/components/BaseLevel.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import BaseButton from '@/components/BaseButton.vue';

const props = defineProps({
  checkable: Boolean,
  groups: Array,
});

const items = computed(() => props.groups);

const isModalDangerActive = ref(false);

const perPageFromDB = parseInt(localStorage.getItem('perPage')) || 10;
const perPage = ref(perPageFromDB);

const currentPage = ref(0);

const checkedRows = ref([]);

const itemsPaginated = computed(() =>
  items.value.slice(perPage.value * currentPage.value, perPage.value * (currentPage.value + 1))
);

const numPages = computed(() => Math.ceil(items.value.length / perPage.value));

const currentPageHuman = computed(() => currentPage.value + 1);

const pagesList = computed(() => {
  const pagesList = [];

  for (let i = 0; i < numPages.value; i++) {
    pagesList.push(i);
  }

  return pagesList;
});

const remove = (arr, cb) => {
  const newArr = [];

  arr.forEach((item) => {
    if (!cb(item)) {
      newArr.push(item);
    }
  });

  return newArr;
};

const checked = (isChecked, client) => {
  if (isChecked) {
    if (!checkedRows.value.find(it => it.id === client.id)) {
      checkedRows.value.push(client);
    }

  } else {
    checkedRows.value = remove(checkedRows.value, (row) => row.id === client.id);
  }
  const checkedIds = checkedRows.value.map(it => it.id);
  emit('check-rows', checkedIds);
};

const checkAll = (isChecked) => {
  const checkedRowIdMap = {};
  checkedRows.value.map(cv => { checkedRowIdMap[cv.id] = cv; });

  if (isChecked) {
    itemsPaginated.value.map(c => {
      checkedRowIdMap[c.id] = c;
    });
  } else {
    itemsPaginated.value.map(c => {
      delete checkedRowIdMap[c.id];
    });
  }

  checkedRows.value = Object.keys(checkedRowIdMap).map(k => {
    return checkedRowIdMap[k];
  });
  const checkedIds = checkedRows.value.map(it => it.id);
  emit('check-rows', checkedIds);

};

const emit = defineEmits(['click-row', 'view-row', 'delete-row', 'check-rows']);
const clickRow = (id) => {
  emit('click-row', id);
};
const viewRow = (id) => {
  emit('view-row', id);
};

const deleteGroup = (id) => {

  isModalDangerActive.value = true;
  emit('delete-row', id);

};
const onPerPageChange = (e) => {
  const pageCount = parseInt(e.target.value || 0);
  if (pageCount > 0) {
    perPage.value = pageCount;
    localStorage.setItem('perPage', pageCount);
  }
};

const onPageNumberClick = (page) => {
  currentPage.value = page;

};



//----------------- Table Drag and Drop Start -----------------
const messageGroupTable = ref(null);
watch(itemsPaginated => {
  nextTick(() => {
    var table = messageGroupTable.value;
    var rows = table.rows;
    var dragSrcEl = null;
    // Loop through each row (skipping the first row which contains the table headers)
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      // Make each row draggable
      row.draggable = true;

      // Add an event listener for when the drag starts
      row.addEventListener('dragstart', function (e) {
        // Set the drag source element to the current row
        dragSrcEl = this;
        // Set the drag effect to "move"
        e.dataTransfer.effectAllowed = 'move';
        // Set the drag data to the outer HTML of the current row
        e.dataTransfer.setData('text/html', this.outerHTML);
        // Add a class to the current row to indicate it is being dragged
        this.classList.add('bg-gray-100');
      });

      // Add an event listener for when the drag ends
      row.addEventListener('dragend', function (e) {
        // Remove the class indicating the row is being dragged
        this.classList.remove('bg-gray-100');
        // Remove the border classes from all table rows
        table.querySelectorAll('.border-t-2', '.border-blue-300').forEach(function (el) {
          el.classList.remove('border-t-2', 'border-blue-300');
        });
      });

      // Add an event listener for when the dragged row is over another row
      row.addEventListener('dragover', function (e) {
        // Prevent the default dragover behavior
        e.preventDefault();
        // Add border classes to the current row to indicate it is a drop target
        this.classList.add('border-t-2', 'border-blue-300');
      });

      // Add an event listener for when the dragged row enters another row
      row.addEventListener('dragenter', function (e) {
        // Prevent the default dragenter behavior
        e.preventDefault();
        // Add border classes to the current row to indicate it is a drop target
        this.classList.add('border-t-2', 'border-blue-300');
      });

      // Add an event listener for when the dragged row leaves another row
      row.addEventListener('dragleave', function (e) {
        // Remove the border classes from the current row
        this.classList.remove('border-t-2', 'border-blue-300');
      });

      // Add an event listener for when the dragged row is dropped onto another row
      row.addEventListener('drop', function (e) {
        // Prevent the default drop behavior
        e.preventDefault();
        // If the drag source element is not the current row
        if (dragSrcEl != this) {
          // Get the index of the drag source element
          var sourceIndex = dragSrcEl.rowIndex;
          // Get the index of the target row
          var targetIndex = this.rowIndex;
          // If the source index is less than the target index
          if (sourceIndex < targetIndex) {
            // Insert the drag source element after the target row
            table.tBodies[0].insertBefore(dragSrcEl, this.nextSibling);
          } else {
            // Insert the drag source element before the target row
            table.tBodies[0].insertBefore(dragSrcEl, this);
          }
        }
        // Remove the border classes from all table rows
        table.querySelectorAll('.border-t-2', '.border-blue-300').forEach(function (el) {
          el.classList.remove('border-t-2', 'border-blue-300');
        });
      });
    }
  });

});

// ----------------- Table Drag and Drop End -----------------


</script>

<template>
  <table id="message-group-table" ref="messageGroupTable">
    <thead class="border-b border-gray-300">
      <tr>
        <TableCheckboxCell v-if="checkable" @checked="checkAll($event)" type="th" />
        <th class="w-10" />
        <th class="text-left">Group Name</th>
        <th>Messages</th>
        <th>Added to OnlyFans</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="client in itemsPaginated" :key="client.id" class="cursor-grab ">
        <TableCheckboxCell v-if="checkable" @checked="checked($event, client)"
          :is-checked="!!checkedRows.find(it => it.id === client.id)" />
        <td>

          <BaseButton color="info" :icon="mdiEye" small @click="viewRow(client.id)" />
        </td>
        <td data-label="Name" class="text-left">
          {{ client.name }}
        </td>
        <td data-label="Messages">
          {{ client.message_count ?? 0 }}
        </td>
        <td data-label="Added to Platform">
          {{ client.added_on_platform_at.split('T')[0] }}
        </td>
        <td data-label="Status">
          {{ client.status === 1 ? 'Active' : 'Inactive' }}
        </td>

        <td data-label="Actions" class="before:hidden lg:w-1 whitespace-nowrap">
          <BaseButtons type="justify-start lg:justify-end" no-wrap>
            <BaseButton color="info" :icon="mdiPen" small @click="clickRow(client.id)" />
            <BaseButton color="danger" :icon="mdiTrashCan" small @click="deleteGroup(client.id)" />
          </BaseButtons>
        </td>
      </tr>
    </tbody>
  </table>
  <div class="p-3 lg:px-6 border-t border-gray-100 dark:border-slate-800">
    <BaseLevel>
      <div>
        <BaseButtons>
          <BaseButton v-for="page in pagesList" :key="page" :active="page === currentPage" :label="page + 1"
            :color="page === currentPage ? 'lightDark' : 'whiteDark'" small @click="onPageNumberClick(page)" />
        </BaseButtons>
        <div>
          Per Page <select class="w-32" @change="onPerPageChange" :value="perPage">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="1000000">All</option>
          </select>
        </div>
      </div>
      <small>Page {{ currentPageHuman }} of {{ numPages }}</small>
    </BaseLevel>
  </div>
</template>
