import React, { useState, useEffect, useMemo, useRef } from 'react'; // Added useRef
import { supabase } from '../../supabaseClient';
import './UserPage.css';

const UserPage = () => {
  const [columns, setColumns] = useState({
    contenu: [],
    paraverbal: [],
    corporel: [],
    support: [],
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ref to store DOM elements of the criteria for scrolling
  const criteriaRefs = useRef({});

  const levels = [
    { label: 'Passable', mult: 1 },
    { label: 'Bien', mult: 2 },
    { label: 'Très Bien', mult: 3 },
    { label: 'Excellent', mult: 4 },
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: opt } = await supabase
      .from('options')
      .select('*')
      .order('created_at', { ascending: true });
    const { data: std } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: true });

    if (opt && std) {
      setStudents(std);
      const organized = {
        contenu: [],
        paraverbal: [],
        corporel: [],
        support: [],
      };
      opt.forEach((o) => {
        if (organized.hasOwnProperty(o.column_id)) {
          const criteriaWithRating =
            o.criteria_list?.map((crit) => ({
              ...crit,
              ratings: o.is_common
                ? { group: 0 }
                : Object.fromEntries(std.map((s) => [s.id, 0])),
            })) || [];
          organized[o.column_id].push({
            ...o,
            criteria_list: criteriaWithRating,
          });
        }
      });
      setColumns(organized);
    }
    setLoading(false);
  };

  const fullStats = useMemo(() => {
    const stats = {};
    students.forEach((s) => {
      stats[s.id] = {
        total: 0,
        contenu: 0,
        paraverbal: 0,
        corporel: 0,
        support: 0,
      };
    });

    Object.entries(columns).forEach(([colId, tasks]) => {
      tasks.forEach((task) => {
        task.criteria_list.forEach((crit) => {
          const points = parseFloat(crit.points) || 0;
          const maxMult = 4;

          if (task.is_common) {
            const val = crit.ratings['group'] || 0;
            const scoreToAdd = val * (points / maxMult);
            students.forEach((s) => {
              stats[s.id][colId] += scoreToAdd;
              stats[s.id].total += scoreToAdd;
            });
          } else {
            students.forEach((s) => {
              const val = crit.ratings[s.id] || 0;
              const scoreToAdd = val * (points / maxMult);
              stats[s.id][colId] += scoreToAdd;
              stats[s.id].total += scoreToAdd;
            });
          }
        });
      });
    });

    Object.keys(stats).forEach((id) => {
      ['total', 'contenu', 'paraverbal', 'corporel', 'support'].forEach(
        (key) => {
          stats[id][key] = parseFloat(stats[id][key].toFixed(2));
        }
      );
    });
    return stats;
  }, [columns, students]);

  const updateRating = (colId, taskId, critIdx, entityId, val) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setColumns((prev) => ({
      ...prev,
      [colId]: prev[colId].map((t) => {
        if (t.id === taskId) {
          const newList = [...t.criteria_list];
          newList[critIdx].ratings = {
            ...newList[critIdx].ratings,
            [entityId]: val,
          };
          return { ...t, criteria_list: newList };
        }
        return t;
      }),
    }));
  };

  const handleSubmit = async () => {
    let firstMissingRef = null;
    let missingFound = false;

    // 1. VALIDATION CHECK
    for (const [colId, tasks] of Object.entries(columns)) {
      for (const task of tasks) {
        for (let i = 0; i < task.criteria_list.length; i++) {
          const crit = task.criteria_list[i];
          const ratings = crit.ratings;

          // Check if any required rating is 0
          const values = Object.values(ratings);
          if (values.some((v) => v === 0)) {
            missingFound = true;
            // Get the ref we stored in the JSX
            const refKey = `${task.id}-${i}`;
            firstMissingRef = criteriaRefs.current[refKey];
            break;
          }
        }
        if (missingFound) break;
      }
      if (missingFound) break;
    }

    if (missingFound && firstMissingRef) {
      alert("Attention : Vous avez oublié d'évaluer certains critères.");
      firstMissingRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight class
      firstMissingRef.classList.add('highlight-missing');
      setTimeout(
        () => firstMissingRef.classList.remove('highlight-missing'),
        2000
      );
      return; // Stop the submission
    }

    // 2. SUBMISSION LOGIC (Only runs if validation passes)
    const allResponses = {};
    const categoryMaps = {
      score_contenu: {},
      score_paraverbal: {},
      score_corporel: {},
      score_support: {},
      final_scores_per_student: {},
    };

    students.forEach((s) => {
      categoryMaps.score_contenu[s.id] = fullStats[s.id].contenu;
      categoryMaps.score_paraverbal[s.id] = fullStats[s.id].paraverbal;
      categoryMaps.score_corporel[s.id] = fullStats[s.id].corporel;
      categoryMaps.score_support[s.id] = fullStats[s.id].support;
      categoryMaps.final_scores_per_student[s.id] = fullStats[s.id].total;
    });

    Object.values(columns)
      .flat()
      .forEach((t) => {
        t.criteria_list.forEach((c) => {
          allResponses[c.subtitle] = c.ratings;
        });
      });

    const { error } = await supabase.from('evaluations').insert([
      {
        responses: allResponses,
        ...categoryMaps,
      },
    ]);

    if (error) alert("Erreur lors de l'enregistrement");
    else {
      alert('Évaluation enregistrée avec succès !');
      window.location.reload();
    }
  };

  if (loading) return <div className="loader">Chargement...</div>;

  return (
    <div className="user-page-responsive">
      <header className="smooth-header">
        <div className="header-inner">
          <h1>Live Evaluation</h1>
          <div className="score-summary-row">
            {students.map((s) => (
              <div key={s.id} className="mini-score-card">
                <span className="mini-name">{s.name.split(' ')[0]}</span>
                <span className="mini-val">{fullStats[s.id].total}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="content-scroll">
        {Object.entries(columns).map(([name, tasks]) => (
          <section key={name} className="fade-in-section">
            <h2 className="section-title">{name.toUpperCase()}</h2>
            {tasks.map((t) => (
              <div key={t.id} className="smooth-card">
                <div className="task-header">
                  <h3 className="task-title">{t.title}</h3>
                  {t.is_common && <span className="common-badge">Groupe</span>}
                </div>

                {t.criteria_list.map((c, i) => (
                  <div
                    key={i}
                    className="crit-item"
                    ref={(el) => (criteriaRefs.current[`${t.id}-${i}`] = el)} // Assigning Ref
                  >
                    <div className="crit-header-row">
                      <div className="crit-info">
                        <p className="crit-name">{c.subtitle}</p>
                        {c.explication && (
                          <p className="crit-explication">{c.explication}</p>
                        )}
                      </div>
                      <span className="crit-pts-badge">{c.points} pts</span>
                    </div>

                    {t.is_common ? (
                      <div className="rating-row">
                        <div className="rating-group-horizontal">
                          {levels.map((l) => (
                            <button
                              key={l.mult}
                              className={`rate-btn ${
                                c.ratings['group'] === l.mult ? 'active' : ''
                              }`}
                              onClick={() =>
                                updateRating(name, t.id, i, 'group', l.mult)
                              }
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      students.map((s) => (
                        <div key={s.id} className="rating-row">
                          <span className="entity-label">{s.name}</span>
                          <div className="rating-group-horizontal">
                            {levels.map((l) => (
                              <button
                                key={l.mult}
                                className={`rate-btn ${
                                  c.ratings[s.id] === l.mult ? 'active' : ''
                                }`}
                                onClick={() =>
                                  updateRating(name, t.id, i, s.id, l.mult)
                                }
                              >
                                {l.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </main>

      <footer className="smooth-footer">
        <button className="submit-button" onClick={handleSubmit}>
          Soumettre l'Évaluation
        </button>
      </footer>
    </div>
  );
};

export default UserPage;
