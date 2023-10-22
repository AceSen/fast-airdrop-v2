import { createRouter, createWebHashHistory } from "vue-router";
import OKXContainer from "@/view/OKXContainer.vue";
import SrarkTaskContainer from "@/view/SrarkTaskContainer.vue";
import FundCollection from "@/view/other/FundCollection.vue";
import Home from "@/view/Home.vue";

const routes = [
  {
    path: "/",
    component: Home,
    name: "Home",
    children: [
      {
        path: "/exchange/okx",
        name: "OKXContainer",
        component: OKXContainer,
    
      },
      {
        path: "/task/stark",
        name: "SrarkTaskContainer",
        component: SrarkTaskContainer,
      },
      {
        path: "/fundCollection",
        name: "FundCollection",
        component: FundCollection,
      },
    ]
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
