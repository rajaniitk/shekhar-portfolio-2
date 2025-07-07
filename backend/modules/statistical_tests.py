import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import chi2_contingency, shapiro, kstest, levene, bartlett, mannwhitneyu, kruskal
import warnings
warnings.filterwarnings('ignore')

class StatisticalTests:
    def __init__(self):
        self.available_tests = {
            'normality': ['shapiro_wilk', 'kolmogorov_smirnov', 'anderson_darling'],
            'comparison': ['t_test', 'paired_t_test', 'mann_whitney_u', 'wilcoxon'],
            'anova': ['one_way_anova', 'two_way_anova', 'kruskal_wallis'],
            'correlation': ['pearson', 'spearman', 'kendall'],
            'categorical': ['chi_square', 'fisher_exact'],
            'variance': ['levene', 'bartlett']
        }
    
    def run_test(self, df: pd.DataFrame, test_type: str, columns: list, **kwargs) -> dict:
        """Run specified statistical test"""
        test_method = getattr(self, f"_{test_type}", None)
        if test_method is None:
            raise ValueError(f"Test type '{test_type}' not available")
        
        try:
            result = test_method(df, columns, **kwargs)
            result['test_type'] = test_type
            result['columns_tested'] = columns
            return result
        except Exception as e:
            return {
                'error': str(e),
                'test_type': test_type,
                'columns_tested': columns
            }
    
    def _shapiro_wilk(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Shapiro-Wilk normality test"""
        results = {}
        
        for col in columns:
            if col not in df.columns:
                results[col] = {'error': 'Column not found'}
                continue
            
            if not pd.api.types.is_numeric_dtype(df[col]):
                results[col] = {'error': 'Column must be numeric'}
                continue
            
            data = df[col].dropna()
            if len(data) < 3:
                results[col] = {'error': 'Insufficient data points'}
                continue
            
            # Shapiro-Wilk test has sample size limitation
            if len(data) > 5000:
                data = data.sample(5000)
            
            try:
                statistic, p_value = shapiro(data)
                results[col] = {
                    'statistic': float(statistic),
                    'p_value': float(p_value),
                    'null_hypothesis': 'Data follows normal distribution',
                    'interpretation': self._interpret_normality_test(p_value),
                    'is_normal': p_value > 0.05,
                    'sample_size': len(data)
                }
            except Exception as e:
                results[col] = {'error': str(e)}
        
        return {
            'test_name': 'Shapiro-Wilk Normality Test',
            'results': results,
            'overall_interpretation': self._overall_normality_interpretation(results)
        }
    
    def _kolmogorov_smirnov(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Kolmogorov-Smirnov normality test"""
        results = {}
        
        for col in columns:
            if col not in df.columns:
                results[col] = {'error': 'Column not found'}
                continue
            
            if not pd.api.types.is_numeric_dtype(df[col]):
                results[col] = {'error': 'Column must be numeric'}
                continue
            
            data = df[col].dropna()
            if len(data) < 3:
                results[col] = {'error': 'Insufficient data points'}
                continue
            
            try:
                # Standardize data for normal distribution comparison
                standardized = (data - data.mean()) / data.std()
                statistic, p_value = kstest(standardized, 'norm')
                
                results[col] = {
                    'statistic': float(statistic),
                    'p_value': float(p_value),
                    'null_hypothesis': 'Data follows normal distribution',
                    'interpretation': self._interpret_normality_test(p_value),
                    'is_normal': p_value > 0.05,
                    'sample_size': len(data)
                }
            except Exception as e:
                results[col] = {'error': str(e)}
        
        return {
            'test_name': 'Kolmogorov-Smirnov Normality Test',
            'results': results,
            'overall_interpretation': self._overall_normality_interpretation(results)
        }
    
    def _t_test(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Independent samples t-test"""
        if len(columns) != 2:
            return {'error': 'T-test requires exactly 2 columns'}
        
        col1, col2 = columns
        
        # Check if columns exist and are numeric
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
            if not pd.api.types.is_numeric_dtype(df[col]):
                return {'error': f'Column {col} must be numeric'}
        
        data1 = df[col1].dropna()
        data2 = df[col2].dropna()
        
        if len(data1) < 2 or len(data2) < 2:
            return {'error': 'Insufficient data points for t-test'}
        
        try:
            # Perform Levene's test for equal variances
            levene_stat, levene_p = levene(data1, data2)
            equal_var = levene_p > 0.05
            
            # Perform t-test
            statistic, p_value = stats.ttest_ind(data1, data2, equal_var=equal_var)
            
            # Calculate effect size (Cohen's d)
            pooled_std = np.sqrt(((len(data1) - 1) * data1.var() + (len(data2) - 1) * data2.var()) / 
                                (len(data1) + len(data2) - 2))
            cohens_d = (data1.mean() - data2.mean()) / pooled_std
            
            return {
                'test_name': 'Independent Samples T-Test',
                'statistic': float(statistic),
                'p_value': float(p_value),
                'degrees_of_freedom': len(data1) + len(data2) - 2,
                'null_hypothesis': 'The means of the two groups are equal',
                'interpretation': self._interpret_t_test(p_value, data1.mean(), data2.mean()),
                'significant': p_value < 0.05,
                'effect_size': {
                    'cohens_d': float(cohens_d),
                    'interpretation': self._interpret_effect_size(cohens_d)
                },
                'group_statistics': {
                    col1: {'mean': data1.mean(), 'std': data1.std(), 'n': len(data1)},
                    col2: {'mean': data2.mean(), 'std': data2.std(), 'n': len(data2)}
                },
                'equal_variances': {
                    'assumption_met': equal_var,
                    'levene_p_value': levene_p
                }
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _paired_t_test(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Paired samples t-test"""
        if len(columns) != 2:
            return {'error': 'Paired t-test requires exactly 2 columns'}
        
        col1, col2 = columns
        
        # Check if columns exist and are numeric
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
            if not pd.api.types.is_numeric_dtype(df[col]):
                return {'error': f'Column {col} must be numeric'}
        
        # Remove rows with missing values in either column
        clean_df = df[[col1, col2]].dropna()
        
        if len(clean_df) < 2:
            return {'error': 'Insufficient paired observations'}
        
        try:
            data1 = clean_df[col1]
            data2 = clean_df[col2]
            
            # Perform paired t-test
            statistic, p_value = stats.ttest_rel(data1, data2)
            
            # Calculate effect size
            differences = data1 - data2
            cohens_d = differences.mean() / differences.std()
            
            return {
                'test_name': 'Paired Samples T-Test',
                'statistic': float(statistic),
                'p_value': float(p_value),
                'degrees_of_freedom': len(clean_df) - 1,
                'null_hypothesis': 'The mean difference between paired observations is zero',
                'interpretation': self._interpret_paired_t_test(p_value, differences.mean()),
                'significant': p_value < 0.05,
                'effect_size': {
                    'cohens_d': float(cohens_d),
                    'interpretation': self._interpret_effect_size(cohens_d)
                },
                'difference_statistics': {
                    'mean_difference': differences.mean(),
                    'std_difference': differences.std(),
                    'n_pairs': len(clean_df)
                }
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _one_way_anova(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """One-way ANOVA"""
        if len(columns) < 2:
            return {'error': 'ANOVA requires at least 2 columns'}
        
        # Check if all columns are numeric
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
            if not pd.api.types.is_numeric_dtype(df[col]):
                return {'error': f'Column {col} must be numeric'}
        
        # Prepare data
        groups = []
        group_names = []
        group_stats = {}
        
        for col in columns:
            data = df[col].dropna()
            if len(data) < 2:
                return {'error': f'Insufficient data in column {col}'}
            groups.append(data)
            group_names.append(col)
            group_stats[col] = {
                'mean': data.mean(),
                'std': data.std(),
                'n': len(data)
            }
        
        try:
            # Perform one-way ANOVA
            f_statistic, p_value = stats.f_oneway(*groups)
            
            # Calculate effect size (eta squared)
            total_n = sum(len(group) for group in groups)
            between_groups_ss = sum(len(group) * (group.mean() - 
                                   np.concatenate(groups).mean())**2 for group in groups)
            total_ss = sum((np.concatenate(groups) - np.concatenate(groups).mean())**2)
            eta_squared = between_groups_ss / total_ss
            
            return {
                'test_name': 'One-Way ANOVA',
                'f_statistic': float(f_statistic),
                'p_value': float(p_value),
                'degrees_of_freedom': {
                    'between': len(groups) - 1,
                    'within': total_n - len(groups)
                },
                'null_hypothesis': 'All group means are equal',
                'interpretation': self._interpret_anova(p_value, group_names),
                'significant': p_value < 0.05,
                'effect_size': {
                    'eta_squared': float(eta_squared),
                    'interpretation': self._interpret_eta_squared(eta_squared)
                },
                'group_statistics': group_stats
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _chi_square(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Chi-square test of independence"""
        if len(columns) != 2:
            return {'error': 'Chi-square test requires exactly 2 columns'}
        
        col1, col2 = columns
        
        # Check if columns exist
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
        
        # Create contingency table
        clean_df = df[[col1, col2]].dropna()
        
        if len(clean_df) < 5:
            return {'error': 'Insufficient data for chi-square test'}
        
        try:
            contingency_table = pd.crosstab(clean_df[col1], clean_df[col2])
            
            # Check if expected frequencies are adequate
            chi2, p_value, dof, expected = chi2_contingency(contingency_table)
            
            if (expected < 5).any().any():
                warning = "Warning: Some expected frequencies are less than 5. Results may be unreliable."
            else:
                warning = None
            
            # Calculate Cramer's V
            n = contingency_table.sum().sum()
            cramers_v = np.sqrt(chi2 / (n * (min(contingency_table.shape) - 1)))
            
            return {
                'test_name': 'Chi-Square Test of Independence',
                'chi2_statistic': float(chi2),
                'p_value': float(p_value),
                'degrees_of_freedom': dof,
                'null_hypothesis': 'The variables are independent',
                'interpretation': self._interpret_chi_square(p_value, col1, col2),
                'significant': p_value < 0.05,
                'effect_size': {
                    'cramers_v': float(cramers_v),
                    'interpretation': self._interpret_cramers_v(cramers_v)
                },
                'contingency_table': contingency_table.to_dict(),
                'expected_frequencies': expected.tolist(),
                'warning': warning
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _pearson(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Pearson correlation test"""
        if len(columns) != 2:
            return {'error': 'Pearson correlation requires exactly 2 columns'}
        
        col1, col2 = columns
        
        # Check if columns exist and are numeric
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
            if not pd.api.types.is_numeric_dtype(df[col]):
                return {'error': f'Column {col} must be numeric'}
        
        # Remove rows with missing values
        clean_df = df[[col1, col2]].dropna()
        
        if len(clean_df) < 3:
            return {'error': 'Insufficient data for correlation test'}
        
        try:
            correlation, p_value = stats.pearsonr(clean_df[col1], clean_df[col2])
            
            return {
                'test_name': 'Pearson Correlation Test',
                'correlation_coefficient': float(correlation),
                'p_value': float(p_value),
                'null_hypothesis': 'There is no linear correlation between the variables',
                'interpretation': self._interpret_correlation(correlation, p_value, 'linear'),
                'significant': p_value < 0.05,
                'strength': self._interpret_correlation_strength(abs(correlation)),
                'sample_size': len(clean_df)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _spearman(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Spearman correlation test"""
        if len(columns) != 2:
            return {'error': 'Spearman correlation requires exactly 2 columns'}
        
        col1, col2 = columns
        
        # Check if columns exist
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
        
        # Remove rows with missing values
        clean_df = df[[col1, col2]].dropna()
        
        if len(clean_df) < 3:
            return {'error': 'Insufficient data for correlation test'}
        
        try:
            correlation, p_value = stats.spearmanr(clean_df[col1], clean_df[col2])
            
            return {
                'test_name': 'Spearman Correlation Test',
                'correlation_coefficient': float(correlation),
                'p_value': float(p_value),
                'null_hypothesis': 'There is no monotonic correlation between the variables',
                'interpretation': self._interpret_correlation(correlation, p_value, 'monotonic'),
                'significant': p_value < 0.05,
                'strength': self._interpret_correlation_strength(abs(correlation)),
                'sample_size': len(clean_df)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _mann_whitney_u(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Mann-Whitney U test (non-parametric alternative to t-test)"""
        if len(columns) != 2:
            return {'error': 'Mann-Whitney U test requires exactly 2 columns'}
        
        col1, col2 = columns
        
        # Check if columns exist
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
        
        data1 = df[col1].dropna()
        data2 = df[col2].dropna()
        
        if len(data1) < 2 or len(data2) < 2:
            return {'error': 'Insufficient data for Mann-Whitney U test'}
        
        try:
            statistic, p_value = mannwhitneyu(data1, data2, alternative='two-sided')
            
            return {
                'test_name': 'Mann-Whitney U Test',
                'u_statistic': float(statistic),
                'p_value': float(p_value),
                'null_hypothesis': 'The distributions of the two groups are equal',
                'interpretation': self._interpret_mann_whitney(p_value, col1, col2),
                'significant': p_value < 0.05,
                'group_statistics': {
                    col1: {'median': data1.median(), 'n': len(data1)},
                    col2: {'median': data2.median(), 'n': len(data2)}
                }
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _kruskal_wallis(self, df: pd.DataFrame, columns: list, **kwargs) -> dict:
        """Kruskal-Wallis test (non-parametric alternative to ANOVA)"""
        if len(columns) < 2:
            return {'error': 'Kruskal-Wallis test requires at least 2 columns'}
        
        # Check if columns exist
        for col in columns:
            if col not in df.columns:
                return {'error': f'Column {col} not found'}
        
        # Prepare data
        groups = []
        group_stats = {}
        
        for col in columns:
            data = df[col].dropna()
            if len(data) < 2:
                return {'error': f'Insufficient data in column {col}'}
            groups.append(data)
            group_stats[col] = {
                'median': data.median(),
                'n': len(data)
            }
        
        try:
            statistic, p_value = kruskal(*groups)
            
            return {
                'test_name': 'Kruskal-Wallis Test',
                'h_statistic': float(statistic),
                'p_value': float(p_value),
                'degrees_of_freedom': len(groups) - 1,
                'null_hypothesis': 'All group distributions are equal',
                'interpretation': self._interpret_kruskal_wallis(p_value, columns),
                'significant': p_value < 0.05,
                'group_statistics': group_stats
            }
        except Exception as e:
            return {'error': str(e)}
    
    # Interpretation methods
    def _interpret_normality_test(self, p_value: float) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: Fail to reject null hypothesis. Data appears to be normally distributed."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Reject null hypothesis. Data does not appear to be normally distributed."
    
    def _overall_normality_interpretation(self, results: dict) -> str:
        normal_count = sum(1 for result in results.values() 
                          if isinstance(result, dict) and result.get('is_normal', False))
        total_count = len([r for r in results.values() if isinstance(r, dict) and 'is_normal' in r])
        
        if total_count == 0:
            return "No valid normality tests performed."
        elif normal_count == total_count:
            return "All tested columns appear to be normally distributed."
        elif normal_count == 0:
            return "None of the tested columns appear to be normally distributed."
        else:
            return f"{normal_count} out of {total_count} columns appear to be normally distributed."
    
    def _interpret_t_test(self, p_value: float, mean1: float, mean2: float) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant difference between group means ({mean1:.3f} vs {mean2:.3f})."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant difference between group means ({mean1:.3f} vs {mean2:.3f})."
    
    def _interpret_paired_t_test(self, p_value: float, mean_diff: float) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant difference between paired observations (mean difference: {mean_diff:.3f})."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant difference between paired observations (mean difference: {mean_diff:.3f})."
    
    def _interpret_anova(self, p_value: float, group_names: list) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant difference between group means across {', '.join(group_names)}."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant difference between at least two group means across {', '.join(group_names)}."
    
    def _interpret_chi_square(self, p_value: float, col1: str, col2: str) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant association between {col1} and {col2}."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant association between {col1} and {col2}."
    
    def _interpret_correlation(self, correlation: float, p_value: float, corr_type: str) -> str:
        strength = self._interpret_correlation_strength(abs(correlation))
        direction = "positive" if correlation > 0 else "negative"
        
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant {corr_type} correlation (r = {correlation:.3f}, {strength})."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant {direction} {corr_type} correlation (r = {correlation:.3f}, {strength})."
    
    def _interpret_mann_whitney(self, p_value: float, col1: str, col2: str) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant difference between distributions of {col1} and {col2}."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant difference between distributions of {col1} and {col2}."
    
    def _interpret_kruskal_wallis(self, p_value: float, columns: list) -> str:
        if p_value > 0.05:
            return f"p-value ({p_value:.4f}) > 0.05: No significant difference between distributions across {', '.join(columns)}."
        else:
            return f"p-value ({p_value:.4f}) ≤ 0.05: Significant difference between at least two distributions across {', '.join(columns)}."
    
    def _interpret_effect_size(self, effect_size: float) -> str:
        abs_effect = abs(effect_size)
        if abs_effect < 0.2:
            return "negligible"
        elif abs_effect < 0.5:
            return "small"
        elif abs_effect < 0.8:
            return "medium"
        else:
            return "large"
    
    def _interpret_eta_squared(self, eta_squared: float) -> str:
        if eta_squared < 0.01:
            return "negligible"
        elif eta_squared < 0.06:
            return "small"
        elif eta_squared < 0.14:
            return "medium"
        else:
            return "large"
    
    def _interpret_cramers_v(self, cramers_v: float) -> str:
        if cramers_v < 0.1:
            return "negligible"
        elif cramers_v < 0.3:
            return "small"
        elif cramers_v < 0.5:
            return "medium"
        else:
            return "large"
    
    def _interpret_correlation_strength(self, correlation: float) -> str:
        if correlation < 0.1:
            return "negligible"
        elif correlation < 0.3:
            return "weak"
        elif correlation < 0.5:
            return "moderate"
        elif correlation < 0.7:
            return "strong"
        else:
            return "very strong"