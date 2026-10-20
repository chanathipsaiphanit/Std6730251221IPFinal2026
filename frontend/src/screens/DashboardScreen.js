import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { api } from '../api';
import { showAlert, confirmAlert, formatMoney } from '../alerts';

// Neo-brutalist palette
const K = {
  bg: '#FFF4DE',
  ink: '#111111',
  yellow: '#FFD23F',
  pink: '#FF6B9A',
  blue: '#3A86FF',
  teal: '#2EC4B6',
  white: '#FFFFFF',
  grey: '#5A5A5A',
};
const TIER_BG = [K.teal, K.blue, K.pink];

function validate(name, position, salary) {
  const n = name.trim();
  const p = position.trim();
  const s = String(salary).trim();
  if (!n || !p || !s) return { error: 'Please fill in name, position and salary.' };
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0) return { error: 'Salary must be a valid positive number.' };
  return { value: { name: n, position: p, salary: num } };
}

export default function DashboardScreen({ onLogout }) {
  const [tab, setTab] = useState('team');

  const [employees, setEmployees] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // add form
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [adding, setAdding] = useState(false);

  // inline edit
  const [editId, setEditId] = useState(null);
  const [eName, setEName] = useState('');
  const [ePosition, setEPosition] = useState('');
  const [eSalary, setESalary] = useState('');
  const [saving, setSaving] = useState(false);

  // analytics
  const [clusters, setClusters] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ---------- Data ----------
  const loadEmployees = useCallback(async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        showAlert('Session expired', 'Please log in again.');
        onLogout();
        return;
      }
      showAlert('Error', err.message);
    }
  }, [onLogout]);

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      await loadEmployees();
      setLoadingList(false);
    })();
  }, [loadEmployees]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const afterChange = async () => {
    setClusters(null); // salaries changed -> previous analysis is stale
    await loadEmployees();
  };

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'Active').length;
    return { total, active, leave: total - active };
  }, [employees]);

  // ---------- Add ----------
  const handleAdd = async () => {
    const { error, value } = validate(name, position, salary);
    if (error) {
      showAlert('Validation Error', error);
      return;
    }
    setAdding(true);
    try {
      await api.addEmployee(value);
      setName('');
      setPosition('');
      setSalary('');
      await afterChange();
      setTab('team');
    } catch (err) {
      showAlert('Add Failed', err.message);
    } finally {
      setAdding(false);
    }
  };

  // ---------- Edit ----------
  const startEdit = (emp) => {
    setEditId(emp.id);
    setEName(emp.name);
    setEPosition(emp.position);
    setESalary(String(emp.salary));
  };

  const cancelEdit = () => setEditId(null);

  const handleSaveEdit = async () => {
    const { error, value } = validate(eName, ePosition, eSalary);
    if (error) {
      showAlert('Validation Error', error);
      return;
    }
    setSaving(true);
    try {
      await api.updateEmployee(editId, value);
      setEditId(null);
      await afterChange();
    } catch (err) {
      showAlert('Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Toggle ----------
  const handleToggle = async (id) => {
    setBusyId(id);
    try {
      await api.toggleStatus(id);
      await loadEmployees();
    } catch (err) {
      showAlert('Update Failed', err.message);
    } finally {
      setBusyId(null);
    }
  };

  // ---------- Delete ----------
  const handleDelete = (emp) => {
    confirmAlert('Are you sure?', `Delete ${emp.name}? This cannot be undone.`, async () => {
      setBusyId(emp.id);
      try {
        await api.deleteEmployee(emp.id);
        if (editId === emp.id) setEditId(null);
        await afterChange();
      } catch (err) {
        showAlert('Delete Failed', err.message);
      } finally {
        setBusyId(null);
      }
    });
  };

  // ---------- K-Means ----------
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setClusters(null);
    try {
      const data = await api.getSalaryClusters();
      setClusters(Array.isArray(data?.clusters) ? data.clusters : []);
    } catch (err) {
      showAlert('Analysis Failed', err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const maxCentroid = clusters?.length ? Math.max(...clusters.map((c) => c.centroid), 1) : 1;

  // ---------- Render ----------
  return (
    <View style={{ flex: 1, backgroundColor: K.bg }}>
      {/* Top bar */}
      <View style={s.topbar}>
        <View style={s.wrapRow}>
          <View style={s.logo}>
            <Text style={s.logoText}>HR/OS</Text>
          </View>
          <Text style={s.topTitle}>staff console</Text>
          <TouchableOpacity style={s.exitBtn} onPress={onLogout}>
            <Text style={s.exitText}>EXIT ↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <View style={s.wrapRow}>
          {[
            ['team', 'TEAM'],
            ['add', '+ ADD'],
            ['insights', 'INSIGHTS'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[s.tab, tab === key && s.tabOn]}
              onPress={() => setTab(key)}
            >
              <Text style={[s.tabText, tab === key && s.tabTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.wrap}>
          {/* ================= TEAM ================= */}
          {tab === 'team' && (
            <>
              <View style={s.statsRow}>
                <StatBox label="TOTAL" value={stats.total} bg={K.yellow} />
                <StatBox label="ACTIVE" value={stats.active} bg={K.teal} />
                <StatBox label="ON LEAVE" value={stats.leave} bg={K.pink} />
              </View>

              {loadingList ? (
                <ActivityIndicator size="large" color={K.ink} style={{ marginTop: 30 }} />
              ) : employees.length === 0 ? (
                <View style={[s.box, { alignItems: 'center' }]}>
                  <Text style={s.emptyText}>NO EMPLOYEES YET</Text>
                </View>
              ) : (
                employees.map((emp, idx) => {
                  const active = emp.status === 'Active';
                  const busy = busyId === emp.id;
                  const editing = editId === emp.id;

                  return (
                    <View key={emp.id} style={[s.box, busy && { opacity: 0.5 }]}>
                      <View style={s.cardHead}>
                        <Text style={s.idTag}>#{String(idx + 1).padStart(2, '0')}</Text>
                        <View
                          style={[
                            s.sticker,
                            { backgroundColor: active ? K.teal : K.pink },
                            { transform: [{ rotate: active ? '-3deg' : '3deg' }] },
                          ]}
                        >
                          <Text style={s.stickerText}>{emp.status.toUpperCase()}</Text>
                        </View>
                      </View>

                      {editing ? (
                        <View style={{ marginTop: 6 }}>
                          <Input label="NAME" value={eName} onChangeText={setEName} />
                          <Input label="POSITION" value={ePosition} onChangeText={setEPosition} />
                          <Input
                            label="SALARY"
                            value={eSalary}
                            onChangeText={setESalary}
                            keyboardType="numeric"
                          />
                          <View style={s.btnRow}>
                            <Btn
                              label={saving ? 'SAVING…' : 'SAVE'}
                              bg={K.yellow}
                              onPress={handleSaveEdit}
                              disabled={saving}
                            />
                            <Btn label="CANCEL" bg={K.white} onPress={cancelEdit} disabled={saving} />
                          </View>
                        </View>
                      ) : (
                        <>
                          <Text style={s.empName}>{emp.name}</Text>
                          <Text style={s.empPos}>{emp.position}</Text>
                          <View style={s.salaryStrip}>
                            <Text style={s.salaryLabel}>SALARY</Text>
                            <Text style={s.salaryValue}>฿{formatMoney(emp.salary)}</Text>
                          </View>
                          <View style={s.btnRow}>
                            <Btn label="EDIT" bg={K.yellow} onPress={() => startEdit(emp)} disabled={busy} />
                            <Btn
                              label="TOGGLE STATUS"
                              bg={K.blue}
                              color={K.white}
                              onPress={() => handleToggle(emp.id)}
                              disabled={busy}
                              grow
                            />
                            <Btn label="DELETE" bg={K.pink} onPress={() => handleDelete(emp)} disabled={busy} />
                          </View>
                        </>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* ================= ADD ================= */}
          {tab === 'add' && (
            <View style={[s.box, { backgroundColor: K.yellow }]}>
              <Text style={s.bigTitle}>NEW HIRE</Text>
              <Text style={s.helper}>All fields are required.</Text>
              <Input label="NAME" value={name} onChangeText={setName} placeholder="Nida Srisuk" />
              <Input
                label="POSITION"
                value={position}
                onChangeText={setPosition}
                placeholder="Data Analyst"
              />
              <Input
                label="SALARY (THB / MONTH)"
                value={salary}
                onChangeText={setSalary}
                placeholder="35000"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[s.bigBtn, adding && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color={K.white} />
                ) : (
                  <Text style={s.bigBtnText}>ADD EMPLOYEE →</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ================= INSIGHTS ================= */}
          {tab === 'insights' && (
            <>
              <View style={[s.box, { backgroundColor: K.blue }]}>
                <Text style={[s.bigTitle, { color: K.white }]}>SALARY STRUCTURE</Text>
                <Text style={[s.helper, { color: '#E6EEFF' }]}>
                  Groups every current salary into 3 tiers with 1D K-Means.
                </Text>
                <TouchableOpacity
                  style={[s.bigBtn, { backgroundColor: K.yellow }, analyzing && { opacity: 0.6 }]}
                  onPress={handleAnalyze}
                  disabled={analyzing}
                >
                  <Text style={[s.bigBtnText, { color: K.ink }]}>ANALYZE SALARY STRUCTURE</Text>
                </TouchableOpacity>
              </View>

              {analyzing && (
                <View style={[s.box, { alignItems: 'center', paddingVertical: 30 }]}>
                  <ActivityIndicator size="large" color={K.ink} />
                  <Text style={s.loadingText}>CALCULATING CLUSTERS…</Text>
                </View>
              )}

              {!analyzing && clusters && clusters.length === 0 && (
                <View style={[s.box, { alignItems: 'center' }]}>
                  <Text style={s.emptyText}>NO SALARY DATA</Text>
                </View>
              )}

              {!analyzing && clusters && clusters.length > 0 && (
                <>
                  {/* Column chart */}
                  <View style={s.box}>
                    <Text style={s.sectionLabel}>AVERAGE SALARY PER TIER</Text>
                    <View style={s.chart}>
                      {clusters.map((c, i) => (
                        <View key={c.group} style={s.col}>
                          <Text style={s.colValue}>{formatMoney(c.centroid / 1000)}k</Text>
                          <View
                            style={[
                              s.colBar,
                              {
                                height: Math.max(16, (c.centroid / maxCentroid) * 150),
                                backgroundColor: TIER_BG[i % TIER_BG.length],
                              },
                            ]}
                          />
                          <Text style={s.colLabel}>{c.group.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Summary cards */}
                  {clusters.map((c, i) => (
                    <View
                      key={`card-${c.group}`}
                      style={[s.box, s.tierRow, { backgroundColor: TIER_BG[i % TIER_BG.length] }]}
                    >
                      <View style={s.tierBadge}>
                        <Text style={s.tierBadgeText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.tierName}>{c.group.toUpperCase()}</Text>
                        <Text style={s.tierAvg}>฿{formatMoney(c.centroid)}</Text>
                        <Text style={s.tierSub}>average base salary</Text>
                      </View>
                      <View style={s.countBox}>
                        <Text style={s.countNum}>{c.count}</Text>
                        <Text style={s.countLabel}>{c.count === 1 ? 'PERSON' : 'PEOPLE'}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------- small components ----------
function StatBox({ label, value, bg }) {
  return (
    <View style={[s.stat, { backgroundColor: bg }]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor="#9A9A9A" {...props} />
    </View>
  );
}

function Btn({ label, bg, color = K.ink, onPress, disabled, grow }) {
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg }, grow && { flex: 1 }, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[s.btnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// "hard shadow" = thicker right/bottom border
const hard = {
  borderWidth: 2.5,
  borderRightWidth: 6,
  borderBottomWidth: 6,
  borderColor: K.ink,
};

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  wrapRow: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: { padding: 16, paddingBottom: 60 },

  topbar: {
    backgroundColor: K.bg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderColor: K.ink,
  },
  logo: { backgroundColor: K.ink, paddingHorizontal: 10, paddingVertical: 6, marginRight: 10 },
  logoText: { color: K.yellow, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: K.ink, fontStyle: 'italic' },
  exitBtn: { ...hard, borderRightWidth: 4, borderBottomWidth: 4, backgroundColor: K.white, paddingHorizontal: 12, paddingVertical: 6 },
  exitText: { fontWeight: '900', color: K.ink, fontSize: 12 },

  tabs: { backgroundColor: K.ink, paddingHorizontal: 16, paddingVertical: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: K.white,
  },
  tabOn: { backgroundColor: K.yellow, borderColor: K.yellow },
  tabText: { color: K.white, fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  tabTextOn: { color: K.ink },

  statsRow: { flexDirection: 'row', marginBottom: 16, marginHorizontal: -5 },
  stat: { ...hard, flex: 1, marginHorizontal: 5, padding: 12 },
  statValue: { fontSize: 32, fontWeight: '900', color: K.ink },
  statLabel: { fontSize: 11, fontWeight: '900', color: K.ink, letterSpacing: 1 },

  box: { ...hard, backgroundColor: K.white, padding: 16, marginBottom: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idTag: { fontWeight: '900', color: K.grey, fontSize: 13, letterSpacing: 1 },
  sticker: { borderWidth: 2, borderColor: K.ink, paddingHorizontal: 10, paddingVertical: 4 },
  stickerText: { fontWeight: '900', fontSize: 11, color: K.ink, letterSpacing: 1 },

  empName: { fontSize: 22, fontWeight: '900', color: K.ink, marginTop: 8 },
  empPos: { fontSize: 14, color: K.grey, fontWeight: '600', marginTop: 2 },
  salaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderColor: K.ink,
    paddingVertical: 8,
    marginTop: 12,
  },
  salaryLabel: { fontWeight: '900', fontSize: 11, letterSpacing: 1.5, color: K.ink },
  salaryValue: { fontWeight: '900', fontSize: 20, color: K.ink },

  btnRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  btn: { ...hard, borderRightWidth: 4, borderBottomWidth: 4, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center' },
  btnText: { fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },

  bigTitle: { fontSize: 26, fontWeight: '900', color: K.ink, letterSpacing: 0.5 },
  helper: { color: K.ink, marginTop: 4, marginBottom: 16, fontWeight: '600' },
  inputLabel: { fontWeight: '900', fontSize: 11, letterSpacing: 1.5, color: K.ink, marginBottom: 6 },
  input: {
    borderWidth: 2.5,
    borderColor: K.ink,
    backgroundColor: K.white,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '600',
    color: K.ink,
  },
  bigBtn: {
    ...hard,
    backgroundColor: K.ink,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    borderColor: K.ink,
  },
  bigBtnText: { color: K.white, fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },

  loadingText: { marginTop: 12, fontWeight: '900', letterSpacing: 1.5, color: K.ink },
  emptyText: { fontWeight: '900', letterSpacing: 1.5, color: K.grey },

  sectionLabel: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5, color: K.ink, marginBottom: 12 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 210,
    marginBottom: 30,
    borderBottomWidth: 3,
    borderColor: K.ink,
  },
  col: { alignItems: 'center', flex: 1 },
  colValue: { fontWeight: '900', color: K.ink, marginBottom: 6 },
  colBar: { width: '60%', borderWidth: 2.5, borderColor: K.ink, borderBottomWidth: 0 },
  colLabel: { position: 'absolute', bottom: -24, fontWeight: '900', fontSize: 11, color: K.ink },

  tierRow: { flexDirection: 'row', alignItems: 'center' },
  tierBadge: {
    width: 44,
    height: 44,
    backgroundColor: K.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tierBadgeText: { color: K.yellow, fontWeight: '900', fontSize: 22 },
  tierName: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5, color: K.ink },
  tierAvg: { fontWeight: '900', fontSize: 24, color: K.ink },
  tierSub: { fontSize: 12, color: K.ink, fontWeight: '600' },
  countBox: { borderWidth: 2.5, borderColor: K.ink, backgroundColor: K.white, padding: 8, alignItems: 'center', minWidth: 70 },
  countNum: { fontWeight: '900', fontSize: 24, color: K.ink },
  countLabel: { fontWeight: '900', fontSize: 9, letterSpacing: 1, color: K.ink },
});
