<script setup>
import { computed, ref, watch } from 'vue';
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

}

</script>

<template>
  <table>
    <thead class="border-b border-gray-300">
      <tr>
        <TableCheckboxCell v-if="checkable" @checked="checkAll($event)" type="th" />
        <th class="w-10" />
        <th class="text-left">Group Name</th>
        <th>Added to OnlyFans</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="client in itemsPaginated" :key="client.id">
        <TableCheckboxCell v-if="checkable" @checked="checked($event, client)"
          :is-checked="!!checkedRows.find(it => it.id === client.id)" />
        <td>

          <BaseButton color="info" :icon="mdiEye" small @click="viewRow(client.id)" />
        </td>
        <td data-label="Name" class="text-left">
          {{ client.name }}
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
