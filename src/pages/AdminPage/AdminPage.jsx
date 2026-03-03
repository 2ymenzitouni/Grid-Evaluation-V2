import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './AdminPage.css';

const AdminPage = () => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState({
    contenu: [],
    paraverbal: [],
    corporel: [],
    support: [],
    creativite: [],
  });
  const [students, setStudents] = useState(['']);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: optionsData } = await supabase
      .from('options')
      .select('*')
      .order('created_at', { ascending: true });
    if (optionsData) {
      const newCols = {
        contenu: [],
        paraverbal: [],
        corporel: [],
        support: [],
        creativite: [],
      };
      optionsData.forEach((item) => {
        if (newCols[item.column_id]) newCols[item.column_id].push(item);
      });
      setColumns(newCols);
    }
    const { data: studentsData } = await supabase
      .from('students')
      .select('name')
      .order('created_at', { ascending: true });
    if (studentsData && studentsData.length > 0)
      setStudents(studentsData.map((s) => s.name));
  };

  // --- NEW: CLEAR DATA FUNCTION ---
  const clearAllData = async () => {
    const confirmClear = window.confirm(
      '⚠️ ATTENTION : Cela va supprimer TOUTES les évaluations et TOUS les étudiants. Cette action est irréversible. Continuer ?'
    );

    if (confirmClear) {
      try {
        // Delete all evaluations
        const { error: evalError } = await supabase
          .from('evaluations')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // Delete all students
        const { error: studentError } = await supabase
          .from('students')
          .delete()
          .neq('name', 'VOID_PROTECTOR');

        if (evalError || studentError) {
          throw new Error('Erreur lors de la suppression');
        }

        setStudents(['']);
        alert('Données réinitialisées avec succès !');
        window.location.reload(); // Refresh to ensure state is clean
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    }
  };

  const addTask = async (columnId) => {
    const newTask = {
      title: 'Nouveau Critère',
      column_id: columnId,
      is_common: false,
      criteria_list: [
        { subtitle: 'Sous-titre', explication: 'Description...' },
      ],
    };

    const { data, error } = await supabase
      .from('options')
      .insert([newTask])
      .select();

    if (error) {
      alert('Erreur Supabase: ' + error.message);
    } else if (data) {
      setColumns({ ...columns, [columnId]: [...columns[columnId], data[0]] });
    }
  };

  const updateTaskInDB = async (taskId, updates) => {
    const { error } = await supabase
      .from('options')
      .update(updates)
      .eq('id', taskId);
    if (error) console.error('Update error:', error);
  };

  const addSubCriteria = (columnId, taskId) => {
    const newColumns = { ...columns };
    const task = newColumns[columnId].find((t) => t.id === taskId);
    const newList = [
      ...(task.criteria_list || []),
      { subtitle: 'Nouveau sous-titre', explication: 'Nouvelle explication' },
    ];
    task.criteria_list = newList;
    setColumns(newColumns);
    updateTaskInDB(taskId, { criteria_list: newList });
  };

  const updateSubCriteria = (columnId, taskId, index, field, value) => {
    const newColumns = { ...columns };
    const task = newColumns[columnId].find((t) => t.id === taskId);
    task.criteria_list[index][field] = value;
    setColumns(newColumns);
    updateTaskInDB(taskId, { criteria_list: task.criteria_list });
  };

  const deleteSubCriteria = (columnId, taskId, index) => {
    const newColumns = { ...columns };
    const task = newColumns[columnId].find((t) => t.id === taskId);
    task.criteria_list.splice(index, 1);
    setColumns(newColumns);
    updateTaskInDB(taskId, { criteria_list: task.criteria_list });
  };

  const handleStudentChange = (i, v) => {
    const s = [...students];
    s[i] = v;
    setStudents(s);
  };

  const saveStudents = async () => {
    await supabase.from('students').delete().neq('name', 'VOID_PROTECTOR');
    const toInsert = students
      .filter((n) => n.trim() !== '')
      .map((name) => ({ name }));
    if (toInsert.length > 0) await supabase.from('students').insert(toInsert);
    alert('Étudiants mis à jour !');
  };

  const renderColumn = (id) => (
    <td className="column-cell" onDragOver={(e) => e.preventDefault()}>
      {columns[id].map((task) => (
        <div
          key={task.id}
          className={`task-card ${task.is_common ? 'is-common-card' : ''}`}
        >
          <div className="task-header-actions">
            <button
              className={`common-toggle-btn ${task.is_common ? 'active' : ''}`}
              onClick={() => {
                const newStatus = !task.is_common;
                task.is_common = newStatus;
                setColumns({ ...columns });
                updateTaskInDB(task.id, { is_common: newStatus });
              }}
            >
              {task.is_common ? '👥 Commun' : '👤 Individuel'}
            </button>
            <button
              className="delete-btn"
              onClick={async () => {
                if (window.confirm('Supprimer cette carte ?')) {
                  await supabase.from('options').delete().eq('id', task.id);
                  setColumns({
                    ...columns,
                    [id]: columns[id].filter((t) => t.id !== task.id),
                  });
                }
              }}
            >
              ×
            </button>
          </div>

          <h2
            className="editable-title"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) =>
              updateTaskInDB(task.id, { title: e.target.innerText })
            }
          >
            {task.title}
          </h2>

          <div className="sub-criteria-container">
            {task.criteria_list?.map((crit, idx) => (
              <div key={idx} className="sub-criteria-item">
                <div className="sub-criteria-header">
                  <h3
                    className="editable-subtitle"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      updateSubCriteria(
                        id,
                        task.id,
                        idx,
                        'subtitle',
                        e.target.innerText
                      )
                    }
                  >
                    {crit.subtitle}
                  </h3>
                  <button
                    className="delete-sub-btn"
                    onClick={() => deleteSubCriteria(id, task.id, idx)}
                  >
                    ×
                  </button>
                </div>
                <p
                  className="explication-text"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    updateSubCriteria(
                      id,
                      task.id,
                      idx,
                      'explication',
                      e.target.innerText
                    )
                  }
                >
                  {crit.explication}
                </p>
              </div>
            ))}
          </div>

          <button
            className="add-sub-btn"
            onClick={() => addSubCriteria(id, task.id)}
          >
            + Ajouter un sous-titre
          </button>
        </div>
      ))}
      <button className="add-button" onClick={() => addTask(id)}>
        + Ajouter un critère
      </button>
    </td>
  );

  return (
    <div className="body-container">
      <div className="admin-header-nav">
        <button onClick={() => navigate('/')} className="back-button">
          ← Retour
        </button>
        <div className="settings-group">
          {/* NEW CLEAR BUTTON */}
          <button onClick={clearAllData} className="clear-data-btn">
            🗑️ Clear Data
          </button>
          <button
            onClick={() => navigate('/admin/settings')}
            className="settings-nav-btn"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => navigate('/user/stats')}
            className="stats-nav-btn"
          >
            📈 Voir les statistiques
          </button>
        </div>
      </div>

      <h1 className="grid-title">Configuration Admin</h1>

      <div className="students-section">
        <h2>Étudiants</h2>
        <div className="students-list">
          {students.map((s, i) => (
            <div key={i} className="student-input-group">
              <input
                className="student-input"
                value={s}
                onChange={(e) => handleStudentChange(i, e.target.value)}
              />
              <button
                className="remove-student-btn"
                onClick={() =>
                  setStudents(students.filter((_, idx) => idx !== i))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="student-actions">
          <button
            className="add-student-btn"
            onClick={() => setStudents([...students, ''])}
          >
            + Étudiant
          </button>
          <button className="save-students-btn" onClick={saveStudents}>
            💾 Enregistrer
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="eval-table">
          <thead>
            <tr>
              <th rowSpan="2">Contenu</th>
              <th colSpan="2">Langage Non Verbal</th>
              <th rowSpan="2">Support</th>
              <th rowSpan="2">Créativité</th>
            </tr>
            <tr>
              <th>Paraverbal</th>
              <th>Corporel</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[
                'contenu',
                'paraverbal',
                'corporel',
                'support',
                'creativite',
              ].map((id) => renderColumn(id))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
