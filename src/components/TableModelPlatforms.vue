<script setup>
import { computed, ref } from 'vue';
import { mdiEye, mdiTrashCan } from '@mdi/js';
import CardBoxModal from '@/components/CardBoxModal.vue';
import TableCheckboxCell from '@/components/TableCheckboxCell.vue';
import BaseLevel from '@/components/BaseLevel.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import BaseButton from '@/components/BaseButton.vue';
import UserAvatar from '@/components/UserAvatar.vue';

const props = defineProps({
  checkable: Boolean,
  models: Array
});


const items = computed(() => props.models);

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
    checkedRows.value.push(client);
  } else {
    checkedRows.value = remove(checkedRows.value, (row) => row.id === client.id);
  }
};

const emit = defineEmits(['click-row']);
const clickRow = (id) => {
  emit('click-row', id);
};
const deleteRow = (id) => {
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
</script>

<template>
  <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" has-cancel>
    <p>Lorem ipsum dolor sit amet <b>adipiscing elit</b></p>
    <p>This is sample modal</p>
  </CardBoxModal>

  <table>
    <thead>
      <tr>
        <th v-if="checkable" />
        <th class="border-b-0 lg:w-6 before:hidden">Id</th>
        <th />
        <th>Name</th>
        <th>Platforms</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr v-for="client in itemsPaginated" :key="client.id">
        <TableCheckboxCell v-if="checkable" @checked="checked($event, client)" />
        <td data-label="Id">
          {{ client?.id }}
        </td>
        <td class="border-b-0 lg:w-6 before:hidden">
          <UserAvatar :username="client.model?.photo || ''" class="w-24 h-24 mx-auto lg:w-6 lg:h-6" />
        </td>

        <td data-label="Name">
          {{ client?.name }}
        </td>
        <td data-label="Platform">
          <!-- {{ client.name }} -->
          {{ client.model_platforms?.map(it => it.platforms?.name || '').join(',') }}
        </td>

        <td class="before:hidden lg:w-1 whitespace-nowrap">
          <BaseButtons type="justify-start lg:justify-end" no-wrap>
            <BaseButton color="info" :icon="mdiEye" small @click="clickRow(client.id)" />
            <BaseButton color="danger" :icon="mdiTrashCan" small @click="deleteRow(client.id)" />
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
