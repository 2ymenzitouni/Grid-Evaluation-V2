import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { supabase } from '../../supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './StatsPage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const StatsPage = () => {
  const navigate = useNavigate(); // Initialize navigate
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: true });
    const { data: stds } = await supabase.from('students').select('*');
    if (evals) setEvaluations(evals);
    if (stds) setStudents(stds);
    setLoading(false);
  };

  const stats = useMemo(() => {
    if (!evaluations.length || !students.length) return null;
    const summary = {};
    students.forEach((s) => {
      summary[s.id] = { name: s.name, total: 0, count: 0 };
    });
    evaluations.forEach((ev) => {
      students.forEach((s) => {
        summary[s.id].total += ev.final_scores_per_student?.[s.id] || 0;
        summary[s.id].count += 1;
      });
    });
    return students.map((s) => ({
      name: summary[s.id].name,
      total: (summary[s.id].total / (summary[s.id].count || 1)).toFixed(2),
    }));
  }, [evaluations, students]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: true,
        color: '#ffffff',
        align: 'center',
        anchor: 'center',
        font: { size: 14, weight: 'bold' },
        formatter: (value) => value,
      },
      legend: { display: true, position: 'bottom' },
      tooltip: { enabled: true },
    },
  };

  const barData = {
    labels: stats?.map((s) => s.name) || [],
    datasets: [
      {
        label: 'Moyenne Générale',
        data: stats?.map((s) => s.total) || [],
        backgroundColor: '#6366f1',
        borderRadius: 10,
      },
    ],
  };

  const pieData = {
    labels: stats?.map((s) => s.name) || [],
    datasets: [
      {
        data: stats?.map((s) => s.total) || [],
        backgroundColor: [
          '#4f46e5',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899',
        ],
        borderWidth: 0,
      },
    ],
  };

  if (loading) return <div className="loader">Chargement...</div>;

  return (
    <div className="stats-page">
      <header className="stats-hero">
        <div className="header-top-row">
          <button onClick={() => navigate('/admin')} className="admin-nav-btn">
            🛠 Page Admin
          </button>
        </div>
        <h1>Dashboard Analytique</h1>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="m-label">Sessions</span>
            <span className="m-value">{evaluations.length}</span>
          </div>
          <div className="metric-card">
            <span className="m-label">Candidats</span>
            <span className="m-value">{students.length}</span>
          </div>
        </div>
      </header>

      <main className="stats-content">
        <section className="visuals-row">
          <div className="chart-wrapper">
            <h3>Moyennes par Candidat</h3>
            <Bar data={barData} options={chartOptions} />
          </div>
          <div className="chart-wrapper">
            <h3>Distribution des Résultats</h3>
            <Pie data={pieData} options={chartOptions} />
          </div>
        </section>

        <section className="history-section">
          <h3>Détail Complet des Passages</h3>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="sticky-col">ID Participant</th>
                  {students.map((s) => (
                    <th key={s.id} className="student-header">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev, idx) => (
                  <tr key={ev.id}>
                    <td className="sticky-col">E{idx + 1}</td>
                    {students.map((s) => (
                      <td key={s.id} className="score-cell">
                        <div className="detailed-score-box">
                          <div className="main-total">
                            Note: {ev.final_scores_per_student?.[s.id] || 0}
                          </div>
                          <div className="full-word-breakdown">
                            <div className="breakdown-item">
                              <span>Contenu</span>
                              <strong>{ev.score_contenu?.[s.id] || 0}</strong>
                            </div>
                            <div className="breakdown-item">
                              <span>Paraverbal</span>
                              <strong>
                                {ev.score_paraverbal?.[s.id] || 0}
                              </strong>
                            </div>
                            <div className="breakdown-item">
                              <span>Corporel</span>
                              <strong>{ev.score_corporel?.[s.id] || 0}</strong>
                            </div>
                            <div className="breakdown-item">
                              <span>Support</span>
                              <strong>{ev.score_support?.[s.id] || 0}</strong>
                            </div>
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StatsPage;
