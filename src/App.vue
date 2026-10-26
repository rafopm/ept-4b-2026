<script setup>
import LoginScreen from './components/LoginScreen.vue'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import DashboardView from './components/DashboardView.vue'
import CalificacionAgilView from './components/CalificacionAgilView.vue'
import GestionEquiposView from './components/GestionEquiposView.vue'
import GamificacionView from './components/GamificacionView.vue'
import ReportesView from './components/ReportesView.vue'
import SorteoView from './components/SorteoView.vue'
import MiEquipoView from './components/MiEquipoView.vue'
import MisNotasView from './components/MisNotasView.vue'
import RankingView from './components/RankingView.vue'
import RankingIndividualView from './components/RankingIndividualView.vue'
import PlanView from './components/PlanView.vue'
import RecursosView from './components/RecursosView.vue'
import AcercaView from './components/AcercaView.vue'
import AppModals from './components/AppModals.vue'
</script>

<template>
  <LoginScreen />
  <div id="app" style="display:none">
    <Sidebar />
    <main class="main">
      <Topbar />
      <DashboardView />
      <CalificacionAgilView />
      <GestionEquiposView />
      <GamificacionView />
      <ReportesView />
      <SorteoView />
      <MiEquipoView />
      <MisNotasView />
      <RankingView />
      <RankingIndividualView />
      <PlanView />
      <RecursosView />
      <AcercaView />
    </main>
  </div>
  <AppModals />
</template>
