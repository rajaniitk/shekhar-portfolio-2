import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import chi2_contingency
import warnings
warnings.filterwarnings('ignore')

class EDAAnalyzer:
    def __init__(self):
        pass
    
    def generate_full_eda(self, df: pd.DataFrame) -> dict:
        """Generate comprehensive EDA report"""
        eda_results = {
            'dataset_overview': self._get_dataset_overview(df),
            'missing_values': self._analyze_missing_values(df),
            'data_types': self._analyze_data_types(df),
            'statistical_summary': self._get_statistical_summary(df),
            'correlation_analysis': self._analyze_correlations(df),
            'distribution_analysis': self._analyze_distributions(df),
            'categorical_analysis': self._analyze_categorical_columns(df),
            'duplicates': self._analyze_duplicates(df)
        }
        return eda_results
    
    def _get_dataset_overview(self, df: pd.DataFrame) -> dict:
        """Get basic dataset information"""
        return {
            'shape': df.shape,
            'total_cells': df.shape[0] * df.shape[1],
            'memory_usage_mb': round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
            'columns': {
                'total': len(df.columns),
                'numeric': len(df.select_dtypes(include=[np.number]).columns),
                'categorical': len(df.select_dtypes(include=['object', 'category']).columns),
                'datetime': len(df.select_dtypes(include=['datetime64']).columns)
            }
        }
    
    def _analyze_missing_values(self, df: pd.DataFrame) -> dict:
        """Analyze missing values in the dataset"""
        missing_count = df.isnull().sum()
        missing_percent = (missing_count / len(df)) * 100
        
        return {
            'total_missing': missing_count.sum(),
            'missing_percentage': round(missing_percent.sum() / len(df.columns), 2),
            'columns_with_missing': missing_count[missing_count > 0].to_dict(),
            'missing_percentages': missing_percent[missing_percent > 0].round(2).to_dict(),
            'complete_rows': len(df.dropna()),
            'complete_rows_percentage': round(len(df.dropna()) / len(df) * 100, 2)
        }
    
    def _analyze_data_types(self, df: pd.DataFrame) -> dict:
        """Analyze data types and suggest improvements"""
        dtype_counts = df.dtypes.value_counts().to_dict()
        
        # Convert numpy dtypes to strings
        dtype_counts = {str(k): v for k, v in dtype_counts.items()}
        
        suggestions = []
        for col in df.columns:
            if df[col].dtype == 'object':
                # Check if it could be numeric
                try:
                    pd.to_numeric(df[col], errors='raise')
                    suggestions.append(f"Column '{col}' might be better as numeric")
                except:
                    # Check if it could be categorical
                    unique_ratio = df[col].nunique() / len(df)
                    if unique_ratio < 0.05:
                        suggestions.append(f"Column '{col}' might be better as categorical")
        
        return {
            'dtype_distribution': dtype_counts,
            'column_dtypes': df.dtypes.astype(str).to_dict(),
            'suggestions': suggestions
        }
    
    def _get_statistical_summary(self, df: pd.DataFrame) -> dict:
        """Get statistical summary for numeric columns"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {'message': 'No numeric columns found'}
        
        summary = numeric_df.describe().to_dict()
        
        # Add skewness and kurtosis
        skewness = numeric_df.skew().to_dict()
        kurtosis = numeric_df.kurtosis().to_dict()
        
        return {
            'descriptive_stats': summary,
            'skewness': skewness,
            'kurtosis': kurtosis,
            'variance': numeric_df.var().to_dict(),
            'std_dev': numeric_df.std().to_dict()
        }
    
    def _analyze_correlations(self, df: pd.DataFrame) -> dict:
        """Analyze correlations between numeric variables"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {'message': 'Need at least 2 numeric columns for correlation analysis'}
        
        pearson_corr = numeric_df.corr(method='pearson').to_dict()
        spearman_corr = numeric_df.corr(method='spearman').to_dict()
        
        # Find high correlations
        high_corr_pairs = []
        for i in range(len(numeric_df.columns)):
            for j in range(i+1, len(numeric_df.columns)):
                col1, col2 = numeric_df.columns[i], numeric_df.columns[j]
                corr_val = abs(pearson_corr[col1][col2])
                if corr_val > 0.7:
                    high_corr_pairs.append({
                        'column1': col1,
                        'column2': col2,
                        'correlation': round(corr_val, 3)
                    })
        
        return {
            'pearson_correlation': pearson_corr,
            'spearman_correlation': spearman_corr,
            'high_correlations': high_corr_pairs
        }
    
    def _analyze_distributions(self, df: pd.DataFrame) -> dict:
        """Analyze distributions of numeric columns"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {'message': 'No numeric columns found'}
        
        distribution_analysis = {}
        
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            
            # Normality tests
            try:
                shapiro_stat, shapiro_p = stats.shapiro(series.sample(min(5000, len(series))))
                ks_stat, ks_p = stats.kstest(series, 'norm')
                
                distribution_analysis[col] = {
                    'normality_tests': {
                        'shapiro_wilk': {'statistic': shapiro_stat, 'p_value': shapiro_p},
                        'kolmogorov_smirnov': {'statistic': ks_stat, 'p_value': ks_p}
                    },
                    'is_normal': shapiro_p > 0.05,
                    'skewness': series.skew(),
                    'kurtosis': series.kurtosis()
                }
            except:
                distribution_analysis[col] = {
                    'error': 'Could not perform normality tests'
                }
        
        return distribution_analysis
    
    def _analyze_categorical_columns(self, df: pd.DataFrame) -> dict:
        """Analyze categorical columns"""
        categorical_df = df.select_dtypes(include=['object', 'category'])
        
        if categorical_df.empty:
            return {'message': 'No categorical columns found'}
        
        categorical_analysis = {}
        
        for col in categorical_df.columns:
            series = categorical_df[col].dropna()
            value_counts = series.value_counts()
            
            categorical_analysis[col] = {
                'unique_values': series.nunique(),
                'most_frequent': value_counts.index[0] if not value_counts.empty else None,
                'most_frequent_count': value_counts.iloc[0] if not value_counts.empty else 0,
                'value_counts': value_counts.head(10).to_dict(),
                'cardinality': series.nunique() / len(series)
            }
        
        return categorical_analysis
    
    def _analyze_duplicates(self, df: pd.DataFrame) -> dict:
        """Analyze duplicate rows"""
        duplicate_rows = df.duplicated().sum()
        
        return {
            'duplicate_rows': duplicate_rows,
            'duplicate_percentage': round(duplicate_rows / len(df) * 100, 2),
            'unique_rows': len(df) - duplicate_rows
        }
    
    def univariate_analysis(self, df: pd.DataFrame, column: str) -> dict:
        """Perform detailed univariate analysis on a single column"""
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        series = df[column]
        analysis = {
            'column_name': column,
            'data_type': str(series.dtype),
            'missing_values': series.isnull().sum(),
            'missing_percentage': round(series.isnull().sum() / len(series) * 100, 2),
            'unique_values': series.nunique(),
            'unique_percentage': round(series.nunique() / len(series) * 100, 2)
        }
        
        if pd.api.types.is_numeric_dtype(series):
            analysis.update(self._numeric_univariate_analysis(series))
        else:
            analysis.update(self._categorical_univariate_analysis(series))
        
        return analysis
    
    def _numeric_univariate_analysis(self, series: pd.Series) -> dict:
        """Perform numeric univariate analysis"""
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            return {'error': 'No valid numeric values found'}
        
        # Basic statistics
        stats_dict = {
            'mean': clean_series.mean(),
            'median': clean_series.median(),
            'mode': clean_series.mode().iloc[0] if not clean_series.mode().empty else None,
            'std': clean_series.std(),
            'var': clean_series.var(),
            'min': clean_series.min(),
            'max': clean_series.max(),
            'range': clean_series.max() - clean_series.min(),
            'q1': clean_series.quantile(0.25),
            'q3': clean_series.quantile(0.75),
            'iqr': clean_series.quantile(0.75) - clean_series.quantile(0.25),
            'skewness': clean_series.skew(),
            'kurtosis': clean_series.kurtosis()
        }
        
        # Outlier detection
        Q1 = clean_series.quantile(0.25)
        Q3 = clean_series.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        outliers = clean_series[(clean_series < lower_bound) | (clean_series > upper_bound)]
        
        stats_dict.update({
            'outliers_count': len(outliers),
            'outliers_percentage': round(len(outliers) / len(clean_series) * 100, 2),
            'outlier_bounds': {'lower': lower_bound, 'upper': upper_bound}
        })
        
        # Normality tests
        try:
            shapiro_stat, shapiro_p = stats.shapiro(clean_series.sample(min(5000, len(clean_series))))
            stats_dict['normality_test'] = {
                'shapiro_wilk': {'statistic': shapiro_stat, 'p_value': shapiro_p},
                'is_normal': shapiro_p > 0.05
            }
        except:
            stats_dict['normality_test'] = {'error': 'Could not perform normality test'}
        
        return stats_dict
    
    def _categorical_univariate_analysis(self, series: pd.Series) -> dict:
        """Perform categorical univariate analysis"""
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            return {'error': 'No valid categorical values found'}
        
        value_counts = clean_series.value_counts()
        
        return {
            'value_counts': value_counts.to_dict(),
            'most_frequent': value_counts.index[0],
            'most_frequent_count': value_counts.iloc[0],
            'most_frequent_percentage': round(value_counts.iloc[0] / len(clean_series) * 100, 2),
            'least_frequent': value_counts.index[-1],
            'least_frequent_count': value_counts.iloc[-1],
            'cardinality': clean_series.nunique() / len(clean_series)
        }
    
    def bivariate_analysis(self, df: pd.DataFrame, col1: str, col2: str) -> dict:
        """Perform bivariate analysis between two columns"""
        if col1 not in df.columns or col2 not in df.columns:
            raise ValueError("One or both columns not found in DataFrame")
        
        series1 = df[col1].dropna()
        series2 = df[col2].dropna()
        
        # Get common indices
        common_idx = series1.index.intersection(series2.index)
        series1 = series1.loc[common_idx]
        series2 = series2.loc[common_idx]
        
        analysis = {
            'column1': col1,
            'column2': col2,
            'column1_type': str(df[col1].dtype),
            'column2_type': str(df[col2].dtype),
            'common_observations': len(common_idx)
        }
        
        # Determine analysis type based on column types
        col1_numeric = pd.api.types.is_numeric_dtype(series1)
        col2_numeric = pd.api.types.is_numeric_dtype(series2)
        
        if col1_numeric and col2_numeric:
            analysis.update(self._numeric_bivariate_analysis(series1, series2))
        elif not col1_numeric and not col2_numeric:
            analysis.update(self._categorical_bivariate_analysis(series1, series2))
        else:
            analysis.update(self._mixed_bivariate_analysis(series1, series2, col1_numeric))
        
        return analysis
    
    def _numeric_bivariate_analysis(self, series1: pd.Series, series2: pd.Series) -> dict:
        """Perform numeric bivariate analysis"""
        # Correlation analysis
        pearson_corr, pearson_p = stats.pearsonr(series1, series2)
        spearman_corr, spearman_p = stats.spearmanr(series1, series2)
        
        return {
            'analysis_type': 'numeric_numeric',
            'pearson_correlation': {
                'coefficient': pearson_corr,
                'p_value': pearson_p,
                'significant': pearson_p < 0.05
            },
            'spearman_correlation': {
                'coefficient': spearman_corr,
                'p_value': spearman_p,
                'significant': spearman_p < 0.05
            },
            'covariance': np.cov(series1, series2)[0, 1]
        }
    
    def _categorical_bivariate_analysis(self, series1: pd.Series, series2: pd.Series) -> dict:
        """Perform categorical bivariate analysis"""
        # Create contingency table
        contingency_table = pd.crosstab(series1, series2)
        
        # Chi-square test
        chi2, p_value, dof, expected = chi2_contingency(contingency_table)
        
        return {
            'analysis_type': 'categorical_categorical',
            'contingency_table': contingency_table.to_dict(),
            'chi_square_test': {
                'statistic': chi2,
                'p_value': p_value,
                'degrees_of_freedom': dof,
                'significant': p_value < 0.05
            },
            'cramers_v': self._calculate_cramers_v(contingency_table)
        }
    
    def _mixed_bivariate_analysis(self, series1: pd.Series, series2: pd.Series, col1_numeric: bool) -> dict:
        """Perform mixed bivariate analysis (numeric vs categorical)"""
        if col1_numeric:
            numeric_series = series1
            categorical_series = series2
        else:
            numeric_series = series2
            categorical_series = series1
        
        # Group statistics
        grouped_stats = {}
        for category in categorical_series.unique():
            mask = categorical_series == category
            group_data = numeric_series[mask]
            
            grouped_stats[str(category)] = {
                'count': len(group_data),
                'mean': group_data.mean(),
                'median': group_data.median(),
                'std': group_data.std()
            }
        
        # ANOVA test
        groups = [numeric_series[categorical_series == cat] for cat in categorical_series.unique()]
        try:
            f_stat, p_value = stats.f_oneway(*groups)
            anova_result = {
                'f_statistic': f_stat,
                'p_value': p_value,
                'significant': p_value < 0.05
            }
        except:
            anova_result = {'error': 'Could not perform ANOVA test'}
        
        return {
            'analysis_type': 'numeric_categorical',
            'grouped_statistics': grouped_stats,
            'anova_test': anova_result
        }
    
    def _calculate_cramers_v(self, contingency_table):
        """Calculate Cramer's V for categorical association"""
        chi2 = stats.chi2_contingency(contingency_table)[0]
        n = contingency_table.sum().sum()
        min_dim = min(contingency_table.shape) - 1
        
        return np.sqrt(chi2 / (n * min_dim))
    
    def compare_columns(self, df: pd.DataFrame, columns: list) -> dict:
        """Compare multiple columns"""
        if len(columns) < 2:
            raise ValueError("At least 2 columns required for comparison")
        
        comparison_results = {
            'columns': columns,
            'pairwise_comparisons': {},
            'overall_statistics': {}
        }
        
        # Pairwise comparisons
        for i in range(len(columns)):
            for j in range(i+1, len(columns)):
                col1, col2 = columns[i], columns[j]
                comparison_results['pairwise_comparisons'][f"{col1}_vs_{col2}"] = \
                    self.bivariate_analysis(df, col1, col2)
        
        # Overall statistics for numeric columns
        numeric_cols = [col for col in columns if pd.api.types.is_numeric_dtype(df[col])]
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            comparison_results['overall_statistics']['correlation_matrix'] = corr_matrix.to_dict()
            
            # Find highest and lowest correlations
            corr_values = []
            for i in range(len(numeric_cols)):
                for j in range(i+1, len(numeric_cols)):
                    corr_values.append({
                        'columns': [numeric_cols[i], numeric_cols[j]],
                        'correlation': corr_matrix.iloc[i, j]
                    })
            
            corr_values.sort(key=lambda x: abs(x['correlation']), reverse=True)
            comparison_results['overall_statistics']['highest_correlation'] = corr_values[0] if corr_values else None
            comparison_results['overall_statistics']['lowest_correlation'] = corr_values[-1] if corr_values else None
        
        return comparison_results