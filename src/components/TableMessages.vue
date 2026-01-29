<script setup>
import { computed, ref } from 'vue';
import { mdiPen, mdiTrashCan } from '@mdi/js';
import TableCheckboxCell from '@/components/TableCheckboxCell.vue';
import BaseLevel from '@/components/BaseLevel.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import BaseButton from '@/components/BaseButton.vue';

const props = defineProps({
  checkable: Boolean,
  messages: Array,
  showGroup: {
    type: Boolean,
    default: true
  }
});



const items = computed(() => props.messages);
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

const convert24to12 = (time_str) => {
  try {
    const [_hours, minutes, seconds] = time_str.split(":");
    const period = +_hours < 12 ? 'AM' : 'PM';
    const hours = +_hours % 12 || 12; // Adjust hours
    return `${hours}:${minutes} ${period}`;
  }
  catch (e) {
    return "";
  }

};

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

const emit = defineEmits(['click-row', 'delete-row', 'check-rows', 'copy-full', 'copy-no-media']);
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

}

</script>

<template>
  <table>
    <thead class="border-b border-gray-300">
      <tr>
        <th v-if="checkable">
          <TableCheckboxCell v-if="checkable" @checked="checkAll($event)" />
        </th>
        <th class="text-left" v-if="props.showGroup"> Group Name </th>
        <th class="text-left"> Message Id </th>
        <th class="text-left"> Message Name </th>
        <th class="text-right">Message Time</th>
        <th class="text-left">Status </th>
        <th class="text-left">External Id </th>
        <th class="text-right">Message List</th>
        <th class="text-right">Message List Exclude</th>
        <th class="text-right">User Tags</th>
        <th class="text-left">Release Form Tags</th>
        <th>Price</th>
        <th>Free Preview</th>
        <th>Attachment</th>

        <!--<th class="text-left">Status</th>-->
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="client in itemsPaginated" :key="client.id">
        <TableCheckboxCell v-if="checkable" @checked="checked($event, client)" />

        <td data-label="Group Name" class="text-left" v-if="props.showGroup">
          {{ client.group_name }}
        </td>
        <td data-label="ID" class="text-left">
          {{ client.id || client.message_id }}
        </td>
        <td data-label="Message Name" class="text-left">
          {{ client.name }}
        </td>
        <td data-label="Message Time" class="text-right">
          {{ convert24to12(client.message_time) }}
        </td>
        <td data-label="Status" class="text-left">
          {{ client.job_status ?? 'new' }}
        </td>
        <td data-label="External Id" class="text-left">
          {{ client.job_external_id ?? client.external_id ?? '' }}
        </td>
        <td data-label="Message List" class="text-left">
          {{ client.message_list }}
        </td>
        <td data-label="Message List Exclude" class="text-left">
          {{ client.message_exclude_list }}
        </td>
        <td data-label="User Tags" class="text-left">
          {{ client.release_user_tags }}
        </td>
        <td data-label="Release From Tags" class="text-left">
          {{ client.release_form_tags }}
        </td>
        <td data-label="Price">
          ${{ parseFloat(client.price).toFixed(2) }}
        </td>
        <td data-label="Free Preview">
          {{ client.free_preview }}
        </td>
        <td data-label="Attachment">
          {{ (client.content ?? '').split(',').filter(it => it.length > 0).length ?? 0 }}
        </td>


        <!--<td data-label="Status">
          {{ client.status === 1 ? 'Active' : 'Inactive' }}
        </td>-->
        <td data-label="Actions" class="before:hidden lg:w-1 whitespace-nowrap">
          <BaseButtons type="justify-start lg:justify-end" no-wrap>
            <BaseButton color="info" label="Full-Copy" small @click.stop="$emit('copy-full', client.id)"/>
            <BaseButton color="info" label="Copy w/o media" small @click.stop="$emit('copy-no-media', client.id)" />
            <BaseButton color="info" label="Edit" :icon="mdiPen" small @click="clickRow(client.id)" />
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
        <div>Page <select class="w-32" @change="onPerPageChange" :value="perPage">
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
