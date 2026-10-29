import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { FilterProvider } from "./hooks/useFilters";
import Claims from "./pages/Claims";
import Insights from "./pages/Insights";
import Overview from "./pages/Overview";
import Plans from "./pages/Plans";
import PolicyDrilldown from "./pages/PolicyDrilldown";
import Policyholders from "./pages/Policyholders";

export default function App() {
  return (
    <FilterProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/policyholders" element={<Policyholders />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/policies" element={<PolicyDrilldown />} />
          <Route path="/policies/:policyId" element={<PolicyDrilldown />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="*" element={<p className="card text-sm">Page not found.</p>} />
        </Routes>
      </Layout>
    </FilterProvider>
  );
}
